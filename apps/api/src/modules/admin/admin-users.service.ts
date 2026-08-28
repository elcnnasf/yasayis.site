import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ListingStatus, UserStatus, type Prisma } from '@yasayis/db';
import type {
  AdminListingRowDto,
  AdminListingsQuery,
  AdminUserDto,
  AdminUsersQuery,
  DeleteListingInput,
  PagedResult,
  SuspendUserInput,
} from '@yasayis/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

/**
 * Admin idarəetmə əməliyyatları  (PROMPT G2)
 *
 * Hər dəyişdirici əməliyyat audit jurnalına yazılır. Jurnal yazısı əməliyyatdan
 * SONRA gedir və uğursuz olsa da əməliyyatı geri qaytarmır — bloklama işləyib,
 * amma jurnal yazılmayıbsa, ikincisi düzəldilə bilər, birincisi yox.
 */
@Injectable()
export class AdminUsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // =========================================================================
  //  İstifadəçilər
  // =========================================================================

  async listUsers(query: AdminUsersQuery): Promise<PagedResult<AdminUserDto>> {
    const where: Prisma.UserWhereInput = { deletedAt: null };

    if (query.status) where.status = query.status;
    if (query.role === 'STUDENT') where.isStudent = true;
    if (query.role === 'OWNER') where.isOwner = true;
    if (query.role === 'ADMIN') where.isAdmin = true;

    if (query.q) {
      const contains = { contains: query.q, mode: 'insensitive' as const };
      where.OR = [{ fullName: contains }, { email: contains }, { phone: contains }];
    }

    const [total, rows] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          isStudent: true,
          isOwner: true,
          isAdmin: true,
          status: true,
          phoneVerifiedAt: true,
          createdAt: true,
          lastLoginAt: true,
          _count: { select: { properties: true } },
        },
      }),
    ]);

    // Şikayət sayı relation ilə alına bilmir: `Report` polimorfikdir
    // (targetType + targetId), ona görə ayrıca toplu sorğu ilə oxunur.
    const reportCounts = await this.prisma.report.groupBy({
      by: ['targetId'],
      where: { targetType: 'USER', targetId: { in: rows.map((r) => r.id) } },
      _count: { _all: true },
    });
    const reportMap = new Map(reportCounts.map((r) => [r.targetId, r._count._all]));

    return {
      total,
      page: query.page,
      pageCount: Math.max(1, Math.ceil(total / query.limit)),
      capped: false,
      items: rows.map((u) => ({
        id: u.id,
        fullName: u.fullName,
        email: u.email,
        phone: u.phone,
        isStudent: u.isStudent,
        isOwner: u.isOwner,
        isAdmin: u.isAdmin,
        status: u.status,
        phoneVerified: u.phoneVerifiedAt !== null,
        listingCount: u._count.properties,
        reportCount: reportMap.get(u.id) ?? 0,
        createdAt: u.createdAt.toISOString(),
        lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
      })),
    };
  }

  /**
   * Bloklama / blokun açılması.
   *
   * Bloklanan istifadəçinin elanları da dayandırılır və bütün sessiyaları
   * ləğv olunur — əks halda blok yalnız yeni girişə təsir edərdi.
   */
  async setSuspended(
    targetUserId: string,
    actorId: string,
    input: SuspendUserInput,
  ): Promise<{ id: string; status: UserStatus }> {
    const user = await this.prisma.user.findFirst({
      where: { id: targetUserId, deletedAt: null },
      select: { id: true, status: true, isAdmin: true },
    });
    if (!user) throw new NotFoundException('İstifadəçi tapılmadı');

    if (user.id === actorId) {
      throw new BadRequestException('Öz hesabınızı bloklaya bilməzsiniz');
    }
    if (user.isAdmin && input.suspend) {
      throw new BadRequestException('Admin hesabı bloklana bilməz');
    }

    const status = input.suspend ? UserStatus.SUSPENDED : UserStatus.ACTIVE;

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.user.update({
        where: { id: targetUserId },
        data: { status },
        select: { id: true, status: true },
      });

      if (input.suspend) {
        await tx.refreshToken.updateMany({
          where: { userId: targetUserId, revokedAt: null },
          data: { revokedAt: new Date() },
        });
        await tx.listing.updateMany({
          where: {
            property: { ownerId: targetUserId },
            status: ListingStatus.ACTIVE,
          },
          data: { status: ListingStatus.SUSPENDED },
        });
        await tx.roommateProfile.updateMany({
          where: { userId: targetUserId },
          data: { visible: false },
        });
      }

      return result;
    });

    await this.audit.record({
      actorId,
      action: input.suspend ? 'user.suspend' : 'user.unsuspend',
      entityType: 'User',
      entityId: targetUserId,
      meta: { reason: input.reason ?? null, previousStatus: user.status },
    });

    return updated;
  }

  // =========================================================================
  //  Elanlar
  // =========================================================================

  async listListings(query: AdminListingsQuery): Promise<PagedResult<AdminListingRowDto>> {
    const where: Prisma.ListingWhereInput = {};
    if (query.status) where.status = query.status;
    if (query.q) {
      where.property = {
        title: { contains: query.q, mode: 'insensitive' },
      };
    }

    const [total, rows] = await Promise.all([
      this.prisma.listing.count({ where }),
      this.prisma.listing.findMany({
        where,
        // Yoxlanılanlar həmişə öndə — moderatorun növbəsi budur.
        orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        select: {
          id: true,
          slug: true,
          status: true,
          createdAt: true,
          property: {
            select: {
              title: true,
              price: true,
              ownerId: true,
              city: { select: { name: true } },
              owner: { select: { fullName: true } },
              _count: { select: { images: true } },
            },
          },
        },
      }),
    ]);

    // Şikayət sayları toplu şəkildə oxunur.
    const reportCounts = await this.prisma.report.groupBy({
      by: ['targetId'],
      where: { targetType: 'LISTING', targetId: { in: rows.map((r) => r.id) } },
      _count: { _all: true },
    });
    const reportMap = new Map(reportCounts.map((r) => [r.targetId, r._count._all]));

    return {
      total,
      page: query.page,
      pageCount: Math.max(1, Math.ceil(total / query.limit)),
      capped: false,
      items: rows.map((l) => ({
        id: l.id,
        slug: l.slug,
        title: l.property.title,
        status: l.status,
        cityName: l.property.city.name,
        price: l.property.price,
        ownerName: l.property.owner.fullName,
        ownerId: l.property.ownerId,
        imageCount: l.property._count.images,
        reportCount: reportMap.get(l.id) ?? 0,
        createdAt: l.createdAt.toISOString(),
      })),
    };
  }

  /**
   * Elanın silinməsi — soft delete.
   *
   * Sətir bazadan getmir: şikayət, audit və statistika ona istinad edir.
   * `Property.deletedAt` qoyulur, elan bütün siyahılardan düşür.
   */
  async deleteListing(
    listingId: string,
    actorId: string,
    input: DeleteListingInput,
  ): Promise<{ id: string }> {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      select: { id: true, propertyId: true, property: { select: { title: true } } },
    });
    if (!listing) throw new NotFoundException('Elan tapılmadı');

    await this.prisma.$transaction([
      this.prisma.property.update({
        where: { id: listing.propertyId },
        data: { deletedAt: new Date() },
      }),
      this.prisma.listing.update({
        where: { id: listingId },
        data: { status: ListingStatus.SUSPENDED, rejectionReason: input.reason },
      }),
      // Polimorfik açarda FK yoxdur — silinən elanın favoritləri əl ilə təmizlənir.
      this.prisma.favorite.deleteMany({
        where: { targetType: 'LISTING', targetId: listingId },
      }),
    ]);

    await this.audit.record({
      actorId,
      action: 'listing.delete',
      entityType: 'Listing',
      entityId: listingId,
      meta: { reason: input.reason, title: listing.property.title },
    });

    return { id: listingId };
  }
}
