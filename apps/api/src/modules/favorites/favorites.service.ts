import { Injectable, NotFoundException } from '@nestjs/common';
import { FavoriteTarget } from '@yasayis/shared';
import type {
  FavoriteIdsDto,
  FavoriteInput,
  FavoritesDto,
  ListingSummaryDto,
  RoommateCardDto,
} from '@yasayis/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import { toSummaryDto } from '../listings/listings.service';
import type { ListingWithRelations } from '../listings/listings.repository';

/**
 * Saxlanılanlar  (PROMPT F1)
 *
 * Bir mexanizm iki növ hədəfi saxlayır. `targetType` + `targetId` polimorfik
 * açar olduğu üçün baza səviyyəsində foreign key yoxdur — bütövlük burada
 * qorunur: yazmadan əvvəl hədəfin mövcudluğu yoxlanılır, oxuyanda isə
 * silinmiş hədəflər nəticədən düşür.
 */
@Injectable()
export class FavoritesService {
  constructor(private readonly prisma: PrismaService) {}

  async add(userId: string, input: FavoriteInput): Promise<{ saved: true }> {
    await this.assertTargetExists(input);

    await this.prisma.favorite.upsert({
      where: {
        userId_targetType_targetId: {
          userId,
          targetType: input.targetType,
          targetId: input.targetId,
        },
      },
      update: {},
      create: { userId, targetType: input.targetType, targetId: input.targetId },
    });

    return { saved: true };
  }

  async remove(userId: string, targetType: FavoriteTarget, targetId: string): Promise<void> {
    await this.prisma.favorite.deleteMany({ where: { userId, targetType, targetId } });
  }

  /** Kartlarda ürək düyməsinin vəziyyəti üçün — yalnız id-lər. */
  async listIds(userId: string): Promise<FavoriteIdsDto> {
    const rows = await this.prisma.favorite.findMany({
      where: { userId },
      select: { targetType: true, targetId: true },
    });

    return {
      listingIds: rows
        .filter((r) => r.targetType === FavoriteTarget.LISTING)
        .map((r) => r.targetId),
      roommateUserIds: rows
        .filter((r) => r.targetType === FavoriteTarget.ROOMMATE)
        .map((r) => r.targetId),
    };
  }

  /** Saxlanılanlar səhifəsi — iki bölmə ayrı-ayrı gəlir. */
  async list(userId: string): Promise<FavoritesDto> {
    const ids = await this.listIds(userId);

    const [listings, roommates] = await Promise.all([
      this.loadListings(ids.listingIds),
      this.loadRoommates(ids.roommateUserIds),
    ]);

    return {
      listings,
      roommates,
      counts: { listings: listings.length, roommates: roommates.length },
    };
  }

  // =========================================================================

  private async loadListings(ids: string[]): Promise<ListingSummaryDto[]> {
    if (ids.length === 0) return [];

    const rows = await this.prisma.listing.findMany({
      where: { id: { in: ids }, property: { deletedAt: null } },
      include: {
        property: {
          include: {
            city: { select: { id: true, name: true, slug: true } },
            district: { select: { id: true, name: true, slug: true } },
            images: { orderBy: { sortOrder: 'asc' } },
            nearbyUniversities: {
              orderBy: { minutes: 'asc' },
              include: {
                university: { select: { id: true, name: true, shortName: true } },
              },
            },
            owner: {
              select: {
                id: true,
                fullName: true,
                phone: true,
                avatarUrl: true,
                phoneVerifiedAt: true,
                createdAt: true,
                ownerProfile: {
                  select: { isCompany: true, companyName: true, verificationStatus: true },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Saxlanılan elan silinibsə və ya dayandırılıbsa, istifadəçi bunu bilməlidir,
    // ona görə status kartda göstərilir və nəticə süzülmür.
    return rows.map((r) => ({
      ...toSummaryDto(r as ListingWithRelations),
      isFavorite: true,
    }));
  }

  private async loadRoommates(userIds: string[]): Promise<RoommateCardDto[]> {
    if (userIds.length === 0) return [];

    const rows = await this.prisma.studentProfile.findMany({
      where: {
        userId: { in: userIds },
        user: { deletedAt: null, status: 'ACTIVE' },
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
            phoneVerifiedAt: true,
            verifications: { where: { type: 'STUDENT' }, select: { status: true } },
          },
        },
        city: { select: { name: true } },
        university: { select: { name: true, shortName: true } },
        major: { select: { name: true } },
        preferredDistricts: { include: { district: { select: { name: true } } } },
      },
    });

    return rows.map((row) => ({
      userId: row.userId,
      fullName: row.user.fullName,
      avatarUrl: row.user.avatarUrl,
      universityName: row.universityIsPublic ? (row.university?.name ?? null) : null,
      universityShortName: row.universityIsPublic
        ? (row.university?.shortName ?? null)
        : null,
      majorName: row.majorIsPublic ? (row.major?.name ?? null) : null,
      cityName: row.city?.name ?? null,
      districtNames: row.preferredDistricts.map((d) => d.district.name),
      budgetMin: row.budgetIsPublic ? row.budgetMin : null,
      budgetMax: row.budgetIsPublic ? row.budgetMax : null,
      lifestyle: row.lifestyleIsPublic ? row.lifestyle : null,
      smoking: row.smokingIsPublic ? row.smoking : null,
      petsAttitude: row.petsAttitudeIsPublic ? row.petsAttitude : null,
      phoneVerified: row.user.phoneVerifiedAt !== null,
      studentVerified: row.user.verifications.some((v) => v.status === 'VERIFIED'),
      // Saxlanılanlar səhifəsində skor yenidən hesablanmır — siyahı sürətli olmalıdır.
      matchScore: null,
      matchReasons: [],
      matchStatus: 'NONE',
    }));
  }

  /** Polimorfik açarda FK olmadığı üçün mövcudluq burada yoxlanılır. */
  private async assertTargetExists(input: FavoriteInput): Promise<void> {
    if (input.targetType === FavoriteTarget.LISTING) {
      const count = await this.prisma.listing.count({ where: { id: input.targetId } });
      if (count === 0) throw new NotFoundException('Elan tapılmadı');
      return;
    }

    const count = await this.prisma.studentProfile.count({
      where: { userId: input.targetId, user: { deletedAt: null } },
    });
    if (count === 0) throw new NotFoundException('Profil tapılmadı');
  }
}
