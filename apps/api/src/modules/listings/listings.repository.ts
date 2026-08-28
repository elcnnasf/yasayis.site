import { Injectable } from '@nestjs/common';
import type { Prisma } from '@yasayis/db';
import { PrismaService } from '../../common/prisma/prisma.service';

/** Elan kartı və detal səhifəsi üçün lazım olan bütün əlaqələr. */
const listingInclude = {
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
} satisfies Prisma.ListingInclude;

export type ListingWithRelations = Prisma.ListingGetPayload<{
  include: typeof listingInclude;
}>;

@Injectable()
export class ListingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Əmlak və elan bir tranzaksiyada yaradılır.
   *
   * Status `ACTIVE`-dir: moderasiya öncədən deyil, sonradandır (bax:
   * `packages/shared/src/lifecycle.ts`). Elan yenə də dərhal görünmür —
   * ictimai siyahılar ən azı bir şəkil tələb edir və şəkillər yaradılışdan
   * sonra yüklənir.
   */
  createWithProperty(
    ownerId: string,
    property: Omit<Prisma.PropertyUncheckedCreateInput, 'ownerId'>,
    listing: Omit<Prisma.ListingUncheckedCreateInput, 'propertyId'>,
    proximities: { universityId: string; minutes: number }[],
  ): Promise<ListingWithRelations> {
    return this.prisma.$transaction(async (tx) => {
      const created = await tx.property.create({
        data: {
          ...property,
          ownerId,
          nearbyUniversities: proximities.length
            ? { createMany: { data: proximities } }
            : undefined,
        },
      });

      return tx.listing.create({
        data: { ...listing, propertyId: created.id, status: 'ACTIVE' },
        include: listingInclude,
      });
    });
  }

  /**
   * Redaktə — əmlak və elan bir tranzaksiyada yenilənir.
   *
   * Yaxınlıq siyahısı göndərilibsə TAM ƏVƏZ OLUNUR: "hansı universitet silindi"
   * hesablamasını client-ə buraxmaq sinxronizasiya səhvləri yaradır, tam siyahı
   * isə həmişə tək mənalıdır.
   */
  updateWithProperty(
    listingId: string,
    propertyId: string,
    property: Prisma.PropertyUncheckedUpdateInput,
    listing: Prisma.ListingUncheckedUpdateInput,
    proximities?: { universityId: string; minutes: number }[],
  ): Promise<ListingWithRelations> {
    return this.prisma.$transaction(async (tx) => {
      await tx.property.update({ where: { id: propertyId }, data: property });

      if (proximities) {
        await tx.propertyUniversityDistance.deleteMany({ where: { propertyId } });
        if (proximities.length) {
          await tx.propertyUniversityDistance.createMany({
            data: proximities.map((p) => ({ ...p, propertyId })),
          });
        }
      }

      return tx.listing.update({
        where: { id: listingId },
        data: listing,
        include: listingInclude,
      });
    });
  }

  /*
    `relationLoadStrategy: 'join'` — `listingInclude` yeddi relation açır və
    standart rejimdə Prisma hər biri üçün AYRI sorğu göndərir. Baza uzaqdadır,
    hər gediş ~0.4 s: elan detalı 3 saniyə çəkirdi. JOIN hamısını birləşdirir.
  */
  findBySlug(slug: string): Promise<ListingWithRelations | null> {
    return this.prisma.listing.findUnique({
      where: { slug },
      include: listingInclude,
      relationLoadStrategy: 'join',
    });
  }

  findById(id: string): Promise<ListingWithRelations | null> {
    return this.prisma.listing.findUnique({
      where: { id },
      include: listingInclude,
      relationLoadStrategy: 'join',
    });
  }

  slugExists(slug: string): Promise<number> {
    return this.prisma.listing.count({ where: { slug } });
  }

  incrementViews(id: string) {
    return this.prisma.listing.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
      select: { id: true },
    });
  }

  /**
   * Açıq siyahı: yalnız aktiv və ən azı bir şəkli olan elanlar.
   * Şəkilsiz elan kartda boş qutu kimi görünür — nəticəyə buraxılmır.
   */
  findActive(args: {
    cityId?: string;
    take: number;
    cursor?: string;
  }): Promise<ListingWithRelations[]> {
    return this.prisma.listing.findMany({
      where: {
        status: 'ACTIVE',
        property: {
          deletedAt: null,
          ...(args.cityId ? { cityId: args.cityId } : {}),
          images: { some: {} },
        },
      },
      include: listingInclude,
      relationLoadStrategy: 'join',
      orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
      take: args.take + 1,
      ...(args.cursor ? { cursor: { id: args.cursor }, skip: 1 } : {}),
    });
  }

  /**
   * Şəhər üzrə aktiv elan sayı — ana səhifədəki şəhər kartları üçün.
   * Şəkilsiz elanlar sayılmır, çünki onlar siyahıda da görünmür.
   */
  findActiveCities() {
    return this.prisma.city.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: { id: true, slug: true, name: true },
    });
  }

  async countActiveByCity(): Promise<{ cityId: string; count: number }[]> {
    const rows = await this.prisma.property.groupBy({
      by: ['cityId'],
      where: {
        deletedAt: null,
        images: { some: {} },
        listings: { some: { status: 'ACTIVE' } },
      },
      _count: { _all: true },
    });
    return rows.map((r) => ({ cityId: r.cityId, count: r._count._all }));
  }

  /**
   * Rayon üzrə aktiv elan sayı və REAL qiymət aralığı.
   *
   * Ana səhifədəki "ən çox axtarılan ərazilər" kartları buradan qidalanır.
   * Aqreqasiya `Listing` üzərindədir, çünki qiymət elandadır, əmlakda deyil;
   * rayon isə əmlakdadır, ona görə groupBy-dan sonra əlaqələndirilir.
   */
  findActiveDistricts(citySlug?: string) {
    return this.prisma.district.findMany({
      where: {
        isActive: true,
        ...(citySlug ? { city: { slug: citySlug } } : {}),
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        slug: true,
        name: true,
        city: { select: { slug: true, name: true } },
      },
    });
  }

  async statsActiveByDistrict(): Promise<
    { districtId: string; count: number; min: number; max: number }[]
  > {
    // Qiymət `Property`-dədir (elan deyil, əmlak qiymətlənir), rayon da orada —
    // ona görə aqreqasiya tam bazada gedir, yaddaşda toplama lazım deyil.
    const rows = await this.prisma.property.groupBy({
      by: ['districtId'],
      where: {
        deletedAt: null,
        images: { some: {} },
        listings: { some: { status: 'ACTIVE' } },
      },
      _count: { _all: true },
      _min: { price: true },
      _max: { price: true },
    });

    return rows.flatMap((row) => {
      // Rayonu göstərilməmiş əmlaklar bir qrupa düşür — kartlarda yeri yoxdur.
      if (row.districtId === null) return [];
      const min = row._min.price;
      const max = row._max.price;
      if (min === null || max === null) return [];

      return [{ districtId: row.districtId, count: row._count._all, min, max }];
    });
  }

  // --- Şəkillər ------------------------------------------------------------

  countImages(propertyId: string): Promise<number> {
    return this.prisma.propertyImage.count({ where: { propertyId } });
  }

  createImage(data: Prisma.PropertyImageUncheckedCreateInput) {
    return this.prisma.propertyImage.create({ data });
  }

  findImages(propertyId: string) {
    return this.prisma.propertyImage.findMany({
      where: { propertyId },
      orderBy: { sortOrder: 'asc' },
    });
  }

  findImage(id: string) {
    return this.prisma.propertyImage.findUnique({ where: { id } });
  }

  deleteImage(id: string) {
    return this.prisma.propertyImage.delete({ where: { id } });
  }

  /**
   * Sıralamanı yenidən yazır. İlk şəkil (sortOrder = 0) avtomatik cover olur —
   * ayrıca "cover seç" əməliyyatı yoxdur.
   */
  reorderImages(propertyId: string, imageIds: string[]) {
    return this.prisma.$transaction(
      imageIds.map((id, index) =>
        this.prisma.propertyImage.update({
          where: { id },
          data: { sortOrder: index, isCover: index === 0 },
        }),
      ),
    ).then(() => this.findImages(propertyId));
  }
}
