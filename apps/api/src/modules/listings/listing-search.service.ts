import { Injectable } from '@nestjs/common';
import type { Prisma } from '@yasayis/db';
import {
  OWNER_TYPES,
  SORT_OPTIONS,
  type ListingSummaryDto,
  type PagedResult,
  type SearchListingsQuery,
} from '@yasayis/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { toSummaryDto } from './listings.service';
import type { ListingWithRelations } from './listings.repository';

/**
 * Elan axtarışı və filtrləri.
 *
 * Sıralama iki mərhələdədir:
 *   1. Filtr SQL-də tətbiq olunur (`buildWhere`) — bu, bütün seçimlərin
 *      yeganə yeridir, təkrarlanmır.
 *   2. "Ən uyğun" sıralaması yaddaşda hesablanır, çünki universitetə yaxınlıq
 *      əlaqəli cədvəldəki `minutes` sahəsindən gəlir və Prisma bu sahəyə görə
 *      birbaşa sıralaya bilmir.
 *
 * Yaddaşdakı sıralama pəncərə ilə məhdudlaşdırılır (`RANK_WINDOW`): nəticə bu
 * həddi aşırsa, sayğac "300+" kimi göstərilir. Həcm artanda bu hissə SQL-ə
 * köçürüləcək — filtr məntiqi onsuz da bir yerdədir, ona görə köçürmə lokaldır.
 */
@Injectable()
export class ListingSearchService {
  private static readonly RANK_WINDOW = 300;

  constructor(
    private readonly prisma: PrismaService,
    private readonly analytics: AnalyticsService,
  ) {}

  async search(
    query: SearchListingsQuery,
    viewerId?: string,
  ): Promise<PagedResult<ListingSummaryDto>> {
    const result = await this.runSearch(query);

    // Huninin 3-cü addımı. Nəticəni gözlətmir — arxa planda yazılır.
    this.analytics.recordSearch({
      userId: viewerId,
      cityId: query.cityId,
      query: query.q,
      resultCount: result.total,
    });

    return result;
  }

  private async runSearch(
    query: SearchListingsQuery,
  ): Promise<PagedResult<ListingSummaryDto>> {
    const where = buildWhere(query);

    // "Ən uyğun" sıralaması üçün seçilmiş universitetə yaxın əmlakların
    // sırası əvvəlcədən oxunur: propertyId → dəqiqə.
    const proximity = await this.loadProximity(query);

    /*
      Yaxınlıq sırası YALNIZ universitet seçiləndə mənalıdır.

      Əvvəl şərt `sort === RELEVANT || proximity.size > 0` idi. "Ən uyğun" isə
      STANDART sıralamadır, ona görə universitetsiz adi axtarış da ranking
      yolundan keçirdi və bu, iki problem yaradırdı:

        1. İki sorğu ARDICIL gedirdi (əvvəl 300-lük pəncərə, sonra səhifənin
           tam sətirləri). SQL yolunda isə say və səhifə `Promise.all` ilə
           PARALEL gedir — uzaq bazada hər gediş ~0.45 s olduğuna görə bu,
           axtarışın yarısı deməkdir.
        2. `total` 300-lə kəsilirdi (`capped`), halbuki heç bir sıralama
           aparılmırdı — istifadəçi yanlış nəticə sayı görürdü.

      Boş yaxınlıq xəritəsi ilə ranking onsuz da heç nə etmir: bütün elanların
      açarı eyni (`MAX_SAFE_INTEGER`) olur və sıralama `compareBySort`-a düşür,
      o da `orderByFor` ilə eyni sıranı verir.
    */
    const useRanking = proximity.size > 0;

    if (!useRanking) {
      return this.searchWithSqlOrder(where, query);
    }

    return this.searchWithRanking(where, query, proximity);
  }

  /** Universitet seçilməyibsə sıralama tamamilə SQL-də aparılır. */
  private async searchWithSqlOrder(
    where: Prisma.ListingWhereInput,
    query: SearchListingsQuery,
  ): Promise<PagedResult<ListingSummaryDto>> {
    const [total, rows] = await Promise.all([
      this.prisma.listing.count({ where }),
      this.prisma.listing.findMany({
        where,
        include: listingInclude,
        // JOIN strategiyası: `listingInclude` 7-8 relation açır və standart
        // rejimdə hər biri AYRICA sorğu olur. Uzaq bazada bu, bir siyahı üçün
        // 7-8 gediş (~3 s) deməkdir; JOIN hamısını bir sorğuya yığır.
        relationLoadStrategy: 'join',
        orderBy: orderByFor(query.sort),
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
    ]);

    return {
      items: rows.map((r) => toSummaryDto(r as ListingWithRelations)),
      total,
      page: query.page,
      pageCount: Math.max(1, Math.ceil(total / query.limit)),
      capped: false,
    };
  }

  /**
   * Universitetə yaxınlığa görə önə çıxarma.
   * Yaxınlığı göstərilməyən elanlar siyahıdan ÇIXARILMIR — sadəcə aşağı düşür.
   */
  private async searchWithRanking(
    where: Prisma.ListingWhereInput,
    query: SearchListingsQuery,
    proximity: Map<string, number>,
  ): Promise<PagedResult<ListingSummaryDto>> {
    const window = await this.prisma.listing.findMany({
      where,
      select: {
        id: true,
        propertyId: true,
        publishedAt: true,
        viewCount: true,
        property: { select: { price: true } },
      },
      orderBy: orderByFor(query.sort),
      take: ListingSearchService.RANK_WINDOW + 1,
    });

    const capped = window.length > ListingSearchService.RANK_WINDOW;
    const pool = capped ? window.slice(0, ListingSearchService.RANK_WINDOW) : window;

    // Yaxınlıq dəqiqəsi kiçik olan öndədir; göstərilməyənlər sona.
    const ranked = [...pool].sort((a, b) => {
      const ra = proximity.get(a.propertyId) ?? Number.MAX_SAFE_INTEGER;
      const rb = proximity.get(b.propertyId) ?? Number.MAX_SAFE_INTEGER;
      if (ra !== rb) return ra - rb;
      return compareBySort(a, b, query.sort);
    });

    const pageIds = ranked
      .slice((query.page - 1) * query.limit, query.page * query.limit)
      .map((r) => r.id);

    if (pageIds.length === 0) {
      return {
        items: [],
        total: pool.length,
        page: query.page,
        pageCount: Math.max(1, Math.ceil(pool.length / query.limit)),
        capped,
      };
    }

    const rows = await this.prisma.listing.findMany({
      where: { id: { in: pageIds } },
      include: listingInclude,
      relationLoadStrategy: 'join',
    });

    // `in` sorğusu sıranı qorumur — pageIds ardıcıllığı bərpa olunur.
    const byId = new Map(rows.map((r) => [r.id, r]));
    const items = pageIds
      .map((id) => byId.get(id))
      .filter((r): r is (typeof rows)[number] => r !== undefined)
      .map((r) => toSummaryDto(r as ListingWithRelations));

    return {
      items,
      total: pool.length,
      page: query.page,
      pageCount: Math.max(1, Math.ceil(pool.length / query.limit)),
      capped,
    };
  }

  private async loadProximity(query: SearchListingsQuery): Promise<Map<string, number>> {
    if (!query.universityId) return new Map();

    const rows = await this.prisma.propertyUniversityDistance.findMany({
      where: { universityId: query.universityId },
      select: { propertyId: true, minutes: true },
    });

    return new Map(rows.map((r) => [r.propertyId, r.minutes]));
  }
}

// ---------------------------------------------------------------------------
// Filtr
// ---------------------------------------------------------------------------

/** Bütün filtrlərin YEGANƏ yeri. */
export function buildWhere(q: SearchListingsQuery): Prisma.ListingWhereInput {
  const propertyWhere: Prisma.PropertyWhereInput = {
    deletedAt: null,
    // Şəkilsiz elan kartda boş qutu kimi görünür — nəticəyə buraxılmır.
    images: { some: {} },
  };

  if (q.cityId) propertyWhere.cityId = q.cityId;
  if (q.districtId?.length) propertyWhere.districtId = { in: q.districtId };
  if (q.roomCount?.length) propertyWhere.roomCount = { in: q.roomCount };
  if (q.hasVacantRoom) propertyWhere.vacantRoomCount = { gt: 0 };
  if (q.utilitiesIncluded) propertyWhere.utilitiesIncluded = true;

  if (q.priceMin !== undefined || q.priceMax !== undefined) {
    propertyWhere.price = {
      ...(q.priceMin !== undefined ? { gte: q.priceMin } : {}),
      ...(q.priceMax !== undefined ? { lte: q.priceMax } : {}),
    };
  }

  // "Depozitsiz" həm null, həm sıfır dəyəri əhatə edir.
  if (q.noDeposit) propertyWhere.OR = [{ deposit: null }, { deposit: 0 }];

  if (q.ownerType) {
    propertyWhere.owner = {
      ownerProfile: { isCompany: q.ownerType === OWNER_TYPES.AGENCY },
    };
  }

  if (q.q) {
    const contains = { contains: q.q, mode: 'insensitive' as const };
    propertyWhere.AND = [
      {
        OR: [
          { title: contains },
          { city: { name: contains } },
          { district: { name: contains } },
          { nearbyUniversities: { some: { university: { name: contains } } } },
        ],
      },
    ];
  }

  const where: Prisma.ListingWhereInput = {
    // Yalnız moderasiyadan keçmiş elanlar axtarışda görünür.
    status: 'ACTIVE',
    property: propertyWhere,
  };

  if (q.forStudents) where.suitableForStudents = true;
  if (q.forWomen) where.suitableForWomen = true;
  if (q.forMen) where.suitableForMen = true;
  if (q.petsAllowed) where.petsAllowed = true;

  if (q.smokingAllowed !== undefined) {
    where.smokingRule = q.smokingAllowed ? { not: 'QADAGANDIR' } : 'QADAGANDIR';
  }

  // Seçilmiş imkanların HAMISI olmalıdır — filtr daraldıcıdır, genişləndirici deyil.
  if (q.amenity?.length) where.amenities = { hasEvery: q.amenity };

  return where;
}

function orderByFor(sort: SearchListingsQuery['sort']): Prisma.ListingOrderByWithRelationInput[] {
  switch (sort) {
    case SORT_OPTIONS.CHEAPEST:
      return [{ property: { price: 'asc' } }, { id: 'desc' }];
    case SORT_OPTIONS.MOST_VIEWED:
      return [{ viewCount: 'desc' }, { id: 'desc' }];
    case SORT_OPTIONS.NEWEST:
    case SORT_OPTIONS.RELEVANT:
    default:
      return [{ publishedAt: 'desc' }, { id: 'desc' }];
  }
}

function compareBySort(
  a: { publishedAt: Date | null; viewCount: number; property: { price: number } },
  b: { publishedAt: Date | null; viewCount: number; property: { price: number } },
  sort: SearchListingsQuery['sort'],
): number {
  switch (sort) {
    case SORT_OPTIONS.CHEAPEST:
      return a.property.price - b.property.price;
    case SORT_OPTIONS.MOST_VIEWED:
      return b.viewCount - a.viewCount;
    default:
      return (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0);
  }
}

const listingInclude = {
  property: {
    include: {
      city: { select: { id: true, name: true, slug: true } },
      district: { select: { id: true, name: true, slug: true } },
      images: { orderBy: { sortOrder: 'asc' } },
      nearbyUniversities: {
        orderBy: { minutes: 'asc' },
        include: { university: { select: { id: true, name: true, shortName: true } } },
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
