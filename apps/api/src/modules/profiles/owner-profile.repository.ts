import { Injectable } from '@nestjs/common';
import type { Prisma } from '@yasayis/db';
import { PrismaService } from '../../common/prisma/prisma.service';

/**
 * Ev sahibi profili və onun elanları.
 *
 * Ayrı repository-dir, çünki tələbə profilindən müstəqil yaşayır: bir istifadəçi
 * yalnız ev sahibi, yalnız tələbə və ya HƏR İKİSİ ola bilər.
 */
@Injectable()
export class OwnerProfileRepository {
  constructor(private readonly prisma: PrismaService) {}

  findOwnerProfile(userId: string) {
    return this.prisma.ownerProfile.findUnique({ where: { userId } });
  }

  createOwnerProfile(userId: string) {
    return this.prisma.ownerProfile.create({ data: { userId } });
  }

  updateOwnerProfile(userId: string, data: Prisma.OwnerProfileUncheckedUpdateInput) {
    return this.prisma.ownerProfile.update({ where: { userId }, data });
  }

  /**
   * İstifadəçinin elanları.
   * Elan `Property` üzərindən gəlir — şəhər/rayon və qiymət orada saxlanılır.
   */
  findOwnListings(userId: string) {
    return this.prisma.listing.findMany({
      where: { property: { ownerId: userId, deletedAt: null } },
      orderBy: [{ createdAt: 'desc' }],
      select: {
        id: true,
        slug: true,
        status: true,
        viewCount: true,
        publishedAt: true,
        expiresAt: true,
        rejectionReason: true,
        property: {
          select: {
            title: true,
            price: true,
            roomCount: true,
            vacantRoomCount: true,
            city: { select: { name: true } },
            district: { select: { name: true } },
            images: {
              where: { isCover: true },
              take: 1,
              select: { url: true },
            },
          },
        },
      },
    });
  }

  async countListings(userId: string): Promise<{ total: number; active: number }> {
    const where: Prisma.ListingWhereInput = {
      property: { ownerId: userId, deletedAt: null },
    };
    const [total, active] = await Promise.all([
      this.prisma.listing.count({ where }),
      this.prisma.listing.count({ where: { ...where, status: 'ACTIVE' } }),
    ]);
    return { total, active };
  }

  /** Təsdiq nişanlarının vəziyyəti (Prompt F4). */
  findVerifications(userId: string) {
    return this.prisma.verification.findMany({
      where: { userId },
      select: { type: true, status: true },
    });
  }

  findUser(userId: string) {
    return this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        avatarUrl: true,
        isStudent: true,
        isOwner: true,
        isAdmin: true,
        phoneVerifiedAt: true,
        createdAt: true,
      },
    });
  }
}
