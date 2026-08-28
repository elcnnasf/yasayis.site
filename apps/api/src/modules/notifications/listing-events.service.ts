import { Injectable, Logger } from '@nestjs/common';
import { NotificationType, type Prisma } from '@yasayis/db';
import { formatPrice } from '@yasayis/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationsService } from './notifications.service';

/**
 * Elan hadisələrindən doğan bildirişlər  (PROMPT I2)
 *
 * Üç hadisə:
 *   1. Elan AKTİV olur      → uyğun `SearchAlert` sahiblərinə "yeni uyğun elan"
 *   2. Elanın qiyməti dəyişir → onu saxlayanlara "qiymət dəyişdi"
 *   3. Elan yenilənir        → onu saxlayanlara "elan yeniləndi"
 *
 * Hamısı "unut və davam et" prinsipi ilə çağırılır: bildiriş uğursuz olsa da
 * moderasiya qərarı və ya redaktə geri qaytarılmır.
 */
@Injectable()
export class ListingEventsService {
  /** Bir elan üzrə ən çox bu qədər adama bildiriş gedir — spam qorunması. */
  private static readonly MAX_ALERT_RECIPIENTS = 200;

  private readonly logger = new Logger(ListingEventsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  /**
   * Elan aktivləşəndə uyğun saxlanmış axtarışları tapır.
   *
   * Uyğunluq SQL-də yoxlanılır: `SearchAlert`-in doldurulmamış sahəsi
   * "fərqi yoxdur" deməkdir, ona görə hər şərt `null` halında keçir.
   */
  async onListingActivated(listingId: string): Promise<number> {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      select: {
        id: true,
        slug: true,
        suitableForStudents: true,
        property: {
          select: {
            title: true,
            price: true,
            roomCount: true,
            cityId: true,
            districtId: true,
            ownerId: true,
            nearbyUniversities: { select: { universityId: true } },
          },
        },
      },
    });

    if (!listing) return 0;
    const p = listing.property;
    const universityIds = p.nearbyUniversities.map((u) => u.universityId);

    const where: Prisma.SearchAlertWhereInput = {
      isActive: true,
      // Öz elanı barədə sahibinə bildiriş getməsin.
      userId: { not: p.ownerId },
      user: { deletedAt: null, status: 'ACTIVE' },
      AND: [
        { OR: [{ cityId: null }, { cityId: p.cityId }] },
        { OR: [{ districtId: null }, ...(p.districtId ? [{ districtId: p.districtId }] : [])] },
        { OR: [{ priceMin: null }, { priceMin: { lte: p.price } }] },
        { OR: [{ priceMax: null }, { priceMax: { gte: p.price } }] },
        { OR: [{ roomCount: null }, { roomCount: p.roomCount }] },
        {
          OR: [
            { universityId: null },
            ...(universityIds.length ? [{ universityId: { in: universityIds } }] : []),
          ],
        },
        // "Yalnız tələbələrə" seçən istifadəçi uyğun olmayan elanı almasın.
        listing.suitableForStudents ? {} : { studentOnly: false },
      ],
    };

    const alerts = await this.prisma.searchAlert.findMany({
      where,
      select: { id: true, userId: true, name: true },
      take: ListingEventsService.MAX_ALERT_RECIPIENTS,
    });

    if (alerts.length === 0) return 0;

    // Eyni istifadəçinin bir neçə uyğun axtarışı ola bilər — bir bildiriş kifayətdir.
    const byUser = new Map<string, { alertId: string; name: string | null }>();
    for (const a of alerts) {
      if (!byUser.has(a.userId)) byUser.set(a.userId, { alertId: a.id, name: a.name });
    }

    const sent = await this.notifications.createMany(
      Array.from(byUser.entries()).map(([userId, alert]) => ({
        userId,
        type: NotificationType.YENI_UYGUN_ELAN,
        payload: {
          listingId: listing.id,
          slug: listing.slug,
          title: p.title,
          price: p.price,
          alertId: alert.alertId,
          alertName: alert.name,
        },
      })),
    );

    await this.prisma.searchAlert
      .updateMany({
        where: { id: { in: alerts.map((a) => a.id) } },
        data: { lastNotifiedAt: new Date() },
      })
      .catch(() => undefined);

    this.logger.log(`Yeni uyğun elan: ${sent} bildiriş (elan ${listing.slug})`);
    return sent;
  }

  /**
   * Qiymət dəyişəndə elanı saxlayanlara xəbər verilir.
   * Ucuzlaşma ilə bahalaşma fərqləndirilir — istifadəçi üçün mənası fərqlidir.
   */
  async onPriceChanged(
    listingId: string,
    oldPrice: number,
    newPrice: number,
  ): Promise<number> {
    if (oldPrice === newPrice) return 0;

    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      select: { id: true, slug: true, property: { select: { title: true } } },
    });
    if (!listing) return 0;

    const userIds = await this.favoritedBy(listingId);
    if (userIds.length === 0) return 0;

    return this.notifications.createMany(
      userIds.map((userId) => ({
        userId,
        type: NotificationType.QIYMET_DEYISDI,
        payload: {
          listingId,
          slug: listing.slug,
          title: listing.property.title,
          oldPrice,
          newPrice,
          direction: newPrice < oldPrice ? 'down' : 'up',
          summary: `${formatPrice(oldPrice)} → ${formatPrice(newPrice)}`,
        },
      })),
    );
  }

  /** Elanın məzmunu yenilənəndə onu saxlayanlara xəbər verilir. */
  async onListingUpdated(listingId: string): Promise<number> {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      select: { id: true, slug: true, property: { select: { title: true } } },
    });
    if (!listing) return 0;

    const userIds = await this.favoritedBy(listingId);
    if (userIds.length === 0) return 0;

    return this.notifications.createMany(
      userIds.map((userId) => ({
        userId,
        type: NotificationType.ELAN_YENILENDI,
        payload: { listingId, slug: listing.slug, title: listing.property.title },
      })),
    );
  }

  /** Favorit polimorfik olduğu üçün relation yoxdur — ayrıca sorğu. */
  private async favoritedBy(listingId: string): Promise<string[]> {
    const rows = await this.prisma.favorite.findMany({
      where: { targetType: 'LISTING', targetId: listingId },
      select: { userId: true },
      take: ListingEventsService.MAX_ALERT_RECIPIENTS,
    });
    return rows.map((r) => r.userId);
  }
}
