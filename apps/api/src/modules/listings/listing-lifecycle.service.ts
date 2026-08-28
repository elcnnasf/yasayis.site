import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ListingStatus, NotificationType, type Listing } from '@yasayis/db';
import {
  canTransition,
  LISTING,
  type ExpireListingInput,
  type ModerateListingInput,
} from '@yasayis/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ListingEventsService } from '../notifications/listing-events.service';

/**
 * Elan həyat dövrü  (PROMPT D5)
 *
 *   PENDING ──admin təsdiqi──▶ ACTIVE ──30 gün──▶ EXPIRED
 *      └──admin rədd edir──▶ REJECTED        ▲        │
 *                                             └sahibi uzadır┘
 *
 * Bütün keçidlər `canTransition` cədvəlindən keçir — statuslar arasında
 * təsadüfi keçid mümkün deyil. Hər keçid həm `ModerationAction` jurnalına,
 * həm də istifadəçi bildirişinə yazılır.
 */
@Injectable()
export class ListingLifecycleService {
  private readonly logger = new Logger(ListingLifecycleService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly events: ListingEventsService,
  ) {}

  // =========================================================================
  //  Sahibi
  // =========================================================================

  /**
   * "Elan artıq aktual deyil" — sahibi istənilən vaxt basa bilər.
   * Elan silinmir, `EXPIRED` olur: tarixçə və statistika qalır, sonra uzadıla bilər.
   */
  async expireByOwner(
    listingId: string,
    ownerId: string,
    input: ExpireListingInput,
  ): Promise<Listing> {
    const listing = await this.requireOwned(listingId, ownerId);
    this.assertTransition(listing.status, ListingStatus.EXPIRED);

    return this.prisma.listing.update({
      where: { id: listingId },
      data: {
        status: ListingStatus.EXPIRED,
        expiresAt: new Date(),
        // Səbəb statistika üçündür, istifadəçiyə göstərilmir.
        rejectionReason: input.reason ?? null,
      },
    });
  }

  /**
   * Uzatma: müddəti bitmiş və ya rədd edilmiş elan bir kliklə yenidən dərc olunur.
   *
   * Moderasiya öncədən olmadığı üçün elan birbaşa `ACTIVE` olur — əvvəl
   * `PENDING`-ə gedirdi və sahibi elanını uzatdıqdan sonra yenə gözləməli idi.
   *
   * `SUSPENDED` elan bura DÜŞMÜR: onu yalnız admin geri qaytara bilər
   * (`ALLOWED_TRANSITIONS`-da `EXPIRED`/`REJECTED` → `ACTIVE` var, `SUSPENDED`
   * → `ACTIVE` isə moderasiya əməliyyatıdır).
   */
  async renewByOwner(listingId: string, ownerId: string): Promise<Listing> {
    const listing = await this.requireOwned(listingId, ownerId);

    if (listing.status === ListingStatus.SUSPENDED) {
      throw new ForbiddenException(
        'Dayandırılmış elanı yalnız admin geri qaytara bilər.',
      );
    }

    this.assertTransition(listing.status, ListingStatus.ACTIVE);

    const renewed = await this.prisma.listing.update({
      where: { id: listingId },
      data: {
        status: ListingStatus.ACTIVE,
        rejectionReason: null,
        moderatedById: null,
        moderatedAt: null,
        publishedAt: listing.publishedAt ?? new Date(),
        expiresAt: new Date(Date.now() + LISTING.EXPIRY_DAYS * 86_400_000),
      },
    });

    // Yenidən dərc olunan elan da saxlanmış axtarışlar üçün "yeni"dir.
    void this.events
      .onListingActivated(listingId)
      .catch((error: unknown) =>
        this.logger.warn(`Uyğun elan bildirişi göndərilmədi: ${String(error)}`),
      );

    return renewed;
  }

  // =========================================================================
  //  Moderator / admin
  // =========================================================================

  async moderate(
    listingId: string,
    moderatorId: string,
    input: ModerateListingInput,
  ): Promise<Listing> {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      include: { property: { select: { ownerId: true, title: true } } },
    });
    if (!listing) throw new NotFoundException('Elan tapılmadı');

    const target = TARGET_STATUS[input.action];
    this.assertTransition(listing.status, target);

    const now = new Date();
    const publishing = target === ListingStatus.ACTIVE;

    const [updated] = await this.prisma.$transaction([
      this.prisma.listing.update({
        where: { id: listingId },
        data: {
          status: target,
          rejectionReason: publishing ? null : (input.reason ?? null),
          moderatedById: moderatorId,
          moderatedAt: now,
          ...(publishing
            ? {
                publishedAt: listing.publishedAt ?? now,
                expiresAt: new Date(now.getTime() + LISTING.EXPIRY_DAYS * 86_400_000),
              }
            : {}),
        },
      }),
      this.prisma.moderationAction.create({
        data: {
          listingId,
          moderatorId,
          action: MOD_ACTION[input.action],
          reason: input.reason ?? null,
        },
      }),
      this.prisma.notification.create({
        data: {
          userId: listing.property.ownerId,
          type: publishing
            ? NotificationType.ELAN_TESDIQLENDI
            : NotificationType.ELAN_REDD_EDILDI,
          payload: {
            listingId,
            slug: listing.slug,
            title: listing.property.title,
            reason: input.reason ?? null,
          },
        },
      }),
    ]);

    // Elan aktivləşdisə, uyğun saxlanmış axtarışların sahiblərinə xəbər gedir.
    // Nəticəni gözləmirik — moderasiya qərarı bildirişdən asılı olmamalıdır.
    if (publishing) {
      void this.events
        .onListingActivated(listingId)
        .catch((error: unknown) =>
          this.logger.warn(`Uyğun elan bildirişi göndərilmədi: ${String(error)}`),
        );
    }

    await this.audit.record({
      actorId: moderatorId,
      action: AUDIT_ACTION[input.action],
      entityType: 'Listing',
      entityId: listingId,
      meta: {
        from: listing.status,
        to: target,
        reason: input.reason ?? null,
        title: listing.property.title,
      },
    });

    return updated;
  }

  // =========================================================================
  //  Avtomatik
  // =========================================================================

  /**
   * Hər gün səhər 03:00-da işləyir.
   *
   * İki iş görür:
   *   1. Müddəti bitməzdən 3 gün əvvəl sahibinə "Bu elan hələ aktualdır?"
   *      bildirişi göndərir (Notification sistemi — Prompt I2).
   *   2. Müddəti keçmiş aktiv elanları `EXPIRED` edir.
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM, { name: 'listing-expiry' })
  async runExpiryCycle(): Promise<void> {
    try {
      const reminded = await this.sendExpiryReminders();
      const expired = await this.expireOverdue();
      if (reminded || expired) {
        this.logger.log(`Elan dövrü: ${reminded} xatırlatma, ${expired} müddəti bitdi`);
      }
    } catch (error) {
      // Cron xətası tətbiqi dayandırmamalıdır — sabah yenidən cəhd edir.
      this.logger.error(`Elan dövrü işləmədi: ${String(error)}`);
    }
  }

  /** "Bu elan hələ aktualdır?" — müddət bitməzdən əvvəl. */
  async sendExpiryReminders(): Promise<number> {
    const threshold = new Date(
      Date.now() + LISTING.EXPIRY_REMINDER_DAYS * 86_400_000,
    );

    const soon = await this.prisma.listing.findMany({
      where: {
        status: ListingStatus.ACTIVE,
        expiresAt: { lte: threshold, gt: new Date() },
      },
      select: {
        id: true,
        slug: true,
        expiresAt: true,
        property: { select: { ownerId: true, title: true } },
      },
    });

    let sent = 0;
    for (const listing of soon) {
      // Eyni elan üçün təkrar xatırlatma göndərilmir.
      const already = await this.prisma.notification.count({
        where: {
          userId: listing.property.ownerId,
          type: NotificationType.ELAN_MUDDETI_BITIR,
          createdAt: { gte: new Date(Date.now() - LISTING.EXPIRY_DAYS * 86_400_000) },
          // Prisma JSON filtrində sadə bərabərlik kifayətdir.
          payload: { path: ['listingId'], equals: listing.id },
        },
      });
      if (already > 0) continue;

      await this.prisma.notification.create({
        data: {
          userId: listing.property.ownerId,
          type: NotificationType.ELAN_MUDDETI_BITIR,
          payload: {
            listingId: listing.id,
            slug: listing.slug,
            title: listing.property.title,
            expiresAt: listing.expiresAt?.toISOString() ?? null,
            question: 'Bu elan hələ aktualdır?',
          },
        },
      });
      sent++;
    }

    return sent;
  }

  /** Müddəti keçmiş aktiv elanları bağlayır. */
  async expireOverdue(): Promise<number> {
    const result = await this.prisma.listing.updateMany({
      where: { status: ListingStatus.ACTIVE, expiresAt: { lte: new Date() } },
      data: { status: ListingStatus.EXPIRED },
    });
    return result.count;
  }

  // =========================================================================

  private assertTransition(from: ListingStatus, to: ListingStatus): void {
    if (from === to) {
      throw new BadRequestException('Elan artıq bu statusdadır');
    }
    if (!canTransition(from, to)) {
      throw new BadRequestException(
        `"${from}" statusundan "${to}" statusuna keçmək olmaz`,
      );
    }
  }

  private async requireOwned(listingId: string, ownerId: string): Promise<Listing> {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      include: { property: { select: { ownerId: true, deletedAt: true } } },
    });

    if (!listing || listing.property.deletedAt) {
      throw new NotFoundException('Elan tapılmadı');
    }
    if (listing.property.ownerId !== ownerId) {
      throw new ForbiddenException('Bu elan sizə aid deyil');
    }
    return listing;
  }
}

const TARGET_STATUS: Record<ModerateListingInput['action'], ListingStatus> = {
  APPROVE: ListingStatus.ACTIVE,
  REJECT: ListingStatus.REJECTED,
  SUSPEND: ListingStatus.SUSPENDED,
  REACTIVATE: ListingStatus.ACTIVE,
};

/** Audit jurnalındakı əməliyyat adları. */
const AUDIT_ACTION: Record<ModerateListingInput['action'], string> = {
  APPROVE: 'listing.approve',
  REJECT: 'listing.reject',
  SUSPEND: 'listing.suspend',
  REACTIVATE: 'listing.reactivate',
};

const MOD_ACTION = {
  APPROVE: 'APPROVE',
  REJECT: 'REJECT',
  SUSPEND: 'PAUSE',
  REACTIVATE: 'APPROVE',
} as const;
