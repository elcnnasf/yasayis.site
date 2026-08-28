import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  SORT_OPTIONS,
  type JointSearchDto,
  type JointSearchInput,
  type ListingSummaryDto,
  type PagedResult,
} from '@yasayis/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ListingSearchService } from '../listings/listing-search.service';
import { RoommatesRepository } from './roommates.repository';

/**
 * "Birlikdə ev axtar"  (PROMPT E3)
 *
 * İki tələbə uyğunlaşdıqdan sonra onların axtarış şərtləri BİRLƏŞİR:
 * büdcələri toplanır (ikisi bir mənzil kirayələyir), rayon seçimləri
 * birləşdirilir, otaq sayı ən azı 2 olur.
 *
 * Nəticələr ayrıca axtarış motoru ilə deyil, D4-dəki eyni motorla gəlir —
 * birgə profil sadəcə filtrləri hazırlayır. Beləliklə axtarış məntiqi
 * iki yerdə saxlanmır.
 */
@Injectable()
export class JointSearchService {
  constructor(
    private readonly repo: RoommatesRepository,
    private readonly prisma: PrismaService,
    private readonly search: ListingSearchService,
  ) {}

  /**
   * Birgə profili qaytarır; yoxdursa iki tərəfin profilindən avtomatik qurur.
   * İstifadəçi heç nə doldurmadan dərhal nəticə görür — sonra dəyişə bilər.
   */
  async getOrCreate(matchId: string, viewerId: string): Promise<JointSearchDto> {
    const match = await this.requireAcceptedMatch(matchId, viewerId);

    const existing = await this.repo.findJointSearch(matchId);
    if (existing) return this.toDto(matchId, viewerId, existing);

    const members = await this.loadMembers(match.userAId, match.userBId);
    const suggestion = suggestFrom(members);

    const created = await this.repo.upsertJointSearch(matchId, suggestion);
    return this.toDto(matchId, viewerId, created);
  }

  async update(
    matchId: string,
    viewerId: string,
    input: JointSearchInput,
  ): Promise<JointSearchDto> {
    await this.requireAcceptedMatch(matchId, viewerId);

    const updated = await this.repo.upsertJointSearch(matchId, {
      budgetMin: input.budgetMin,
      budgetMax: input.budgetMax,
      roomCount: input.roomCount,
      studentsOnly: input.studentsOnly,
      districtIds: input.districtIds,
    });

    return this.toDto(matchId, viewerId, updated);
  }

  /** Birgə profilə uyğun elanlar — D4 motoru ilə. */
  async findListings(
    matchId: string,
    viewerId: string,
    page: number,
    limit: number,
  ): Promise<PagedResult<ListingSummaryDto>> {
    const profile = await this.getOrCreate(matchId, viewerId);

    return this.search.search({
      page,
      limit,
      cityId: profile.cityId ?? undefined,
      districtId: profile.districtIds.length ? profile.districtIds : undefined,
      priceMin: profile.budgetMin,
      priceMax: profile.budgetMax,
      roomCount: [profile.roomCount],
      // İki nəfər birlikdə köçür — boş otağı olan mənzil onlara uyğun deyil,
      // bütöv mənzil lazımdır, ona görə "boş otaq" filtri qoyulmur.
      forStudents: profile.studentsOnly || undefined,
      sort: SORT_OPTIONS.CHEAPEST,
    });
  }

  // =========================================================================

  private async requireAcceptedMatch(matchId: string, viewerId: string) {
    const match = await this.repo.findMatchById(matchId);
    if (!match) throw new NotFoundException('Uyğunlaşma tapılmadı');

    if (match.userAId !== viewerId && match.userBId !== viewerId) {
      throw new ForbiddenException('Bu uyğunlaşma sizə aid deyil');
    }
    if (match.status !== 'ACCEPTED') {
      throw new BadRequestException(
        'Birlikdə ev axtarmaq üçün əvvəlcə hər iki tərəf uyğunlaşmanı qəbul etməlidir',
      );
    }
    return match;
  }

  private loadMembers(userAId: string, userBId: string) {
    return this.prisma.studentProfile.findMany({
      where: { userId: { in: [userAId, userBId] } },
      include: {
        user: { select: { id: true, fullName: true, avatarUrl: true } },
        city: { select: { id: true, name: true } },
        preferredDistricts: { select: { districtId: true } },
      },
    });
  }

  private async toDto(
    matchId: string,
    viewerId: string,
    row: {
      id: string;
      budgetMin: number;
      budgetMax: number;
      roomCount: number;
      studentsOnly: boolean;
      isActive: boolean;
      districts: { districtId: string; district: { id: string; name: string } }[];
    },
  ): Promise<JointSearchDto> {
    const match = await this.repo.findMatchById(matchId);
    if (!match) throw new NotFoundException('Uyğunlaşma tapılmadı');

    const members = await this.loadMembers(match.userAId, match.userBId);

    // Başlıq həmişə "mən + digəri" sırasındadır ki, hər tərəf öz adını əvvəldə görsün.
    const ordered = [...members].sort((a) =>
      a.userId === viewerId ? -1 : 1,
    );

    const firstNames = ordered.map((m) => m.user.fullName.split(' ')[0] ?? m.user.fullName);
    const city = ordered.find((m) => m.city)?.city ?? null;

    return {
      id: row.id,
      matchId,
      title: firstNames.join(' + '),
      members: ordered.map((m) => ({
        userId: m.userId,
        fullName: m.user.fullName,
        avatarUrl: m.user.avatarUrl,
        budgetMin: m.budgetMin,
        budgetMax: m.budgetMax,
      })),
      budgetMin: row.budgetMin,
      budgetMax: row.budgetMax,
      roomCount: row.roomCount,
      districtIds: row.districts.map((d) => d.districtId),
      districtNames: row.districts.map((d) => d.district.name),
      cityId: city?.id ?? null,
      cityName: city?.name ?? null,
      studentsOnly: row.studentsOnly,
      isActive: row.isActive,
    };
  }
}

/**
 * İki profildən birgə axtarış təklifi.
 * Büdcələr TOPLANIR — ikisi bir mənzili birlikdə kirayələyir.
 */
function suggestFrom(
  members: { budgetMin: number | null; budgetMax: number | null; preferredDistricts: { districtId: string }[] }[],
): {
  budgetMin: number;
  budgetMax: number;
  roomCount: number;
  studentsOnly: boolean;
  districtIds: string[];
} {
  const budgetMin = members.reduce((sum, m) => sum + (m.budgetMin ?? 0), 0);
  const budgetMax = members.reduce((sum, m) => sum + (m.budgetMax ?? 0), 0);

  // Rayon seçimləri birləşdirilir: birinin seçdiyi digəri üçün də göstərilir.
  const districtIds = Array.from(
    new Set(members.flatMap((m) => m.preferredDistricts.map((d) => d.districtId))),
  ).slice(0, 10);

  return {
    budgetMin,
    // Heç kim büdcə yazmayıbsa, filtr açıq qalsın.
    budgetMax: budgetMax > 0 ? budgetMax : Number.MAX_SAFE_INTEGER / 2,
    roomCount: 2,
    studentsOnly: true,
    districtIds,
  };
}
