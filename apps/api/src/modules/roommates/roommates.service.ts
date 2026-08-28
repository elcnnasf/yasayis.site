import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { NotificationType, type Prisma } from '@yasayis/db';
import {
  passesHardFilters,
  SCORE_EXPLANATION,
  type MatchBreakdownDto,
  type MatchCandidate,
  type RoommateCardDto,
  type RoommateMatchDto,
  type SearchRoommatesQuery,
} from '@yasayis/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { MatchingWeightsService } from '../matching/matching-weights.service';
import { RoommatesRepository, type RoommateCandidate } from './roommates.repository';

/**
 * Otaq yoldaşı kəşfi və uyğunlaşma.
 *
 * Skorlama `MatchingWeightsService.getScorer()`-dan gəlir — bu service formulanı
 * bilmir, yalnız interfeysi çağırır. Formula gələcəkdə dəyişsə, bura toxunulmur.
 */
@Injectable()
export class RoommatesService {
  private static readonly CANDIDATE_WINDOW = 200;

  private readonly logger = new Logger(RoommatesService.name);

  constructor(
    private readonly repo: RoommatesRepository,
    private readonly weights: MatchingWeightsService,
    private readonly prisma: PrismaService,
    private readonly contacts: AnalyticsService,
  ) {}

  // =========================================================================
  //  Kəşf
  // =========================================================================

  async discover(
    query: SearchRoommatesQuery,
    viewerId?: string,
  ): Promise<{ items: RoommateCardDto[]; total: number }> {
    const viewerProfile = viewerId ? await this.repo.findProfile(viewerId) : null;
    const viewer = viewerProfile ? toCandidate(viewerProfile) : null;

    const candidates = await this.repo.findCandidates({
      excludeUserId: viewerId,
      cityId: query.cityId ?? viewer?.cityId ?? undefined,
      universityId: query.universityId,
      budgetMin: query.budgetMin,
      budgetMax: query.budgetMax,
      take: RoommatesService.CANDIDATE_WINDOW,
    });

    const statuses = viewerId ? await this.repo.matchStatuses(viewerId) : new Map();
    const scorer = await this.weights.getScorer();

    const cards: RoommateCardDto[] = [];

    for (const row of candidates) {
      const other = toCandidate(row);

      // Giriş etməyən ziyarətçi üçün skor hesablanmır, amma profil görünür.
      let score: number | null = null;
      let reasons: string[] = [];

      if (viewer) {
        if (!passesHardFilters(viewer, other)) continue;
        const result = scorer.score(viewer, other);
        if (query.minScore !== undefined && result.score < query.minScore) continue;
        score = result.score;
        reasons = result.matches;
      }

      cards.push(toCard(row, score, reasons, statuses.get(row.userId), viewerId));
    }

    // Skoru olanlar yuxarıda; skor yoxdursa (qonaq) yenilik sırası qalır.
    if (viewer) cards.sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0));

    const start = (query.limit ?? 20) * 0;
    return { items: cards.slice(start, start + (query.limit ?? 20)), total: cards.length };
  }

  /** Profil səhifəsindəki tam izah — hansı amil neçə bal verdi. */
  async breakdown(viewerId: string, otherUserId: string): Promise<MatchBreakdownDto> {
    const [viewerRow, otherRow] = await Promise.all([
      this.repo.findProfile(viewerId),
      this.repo.findProfile(otherUserId),
    ]);

    if (!viewerRow) throw new BadRequestException('Əvvəlcə öz profilinizi tamamlayın');
    if (!otherRow) throw new NotFoundException('Profil tapılmadı');

    const scorer = await this.weights.getScorer();
    const result = scorer.score(toCandidate(viewerRow), toCandidate(otherRow));

    return {
      score: result.score,
      explanation: result.explanation,
      factors: result.factors.map((f) => ({
        key: f.key,
        label: f.label,
        weight: f.weight,
        points: f.points,
        similarity: f.similarity,
      })),
      matches: result.matches,
      difference: result.difference,
    };
  }

  // =========================================================================
  //  Uyğunlaşma
  // =========================================================================

  async requestMatch(viewerId: string, targetUserId: string): Promise<RoommateMatchDto> {
    if (viewerId === targetUserId) {
      throw new BadRequestException('Özünüzlə uyğunlaşa bilməzsiniz');
    }

    const existing = await this.repo.findMatch(viewerId, targetUserId);

    // Qarşı tərəf artıq təklif göndəribsə, bu klik qəbul mənasına gəlir.
    if (existing) {
      if (existing.status === 'ACCEPTED') {
        throw new ConflictException('Artıq uyğunlaşmısınız');
      }
      if (existing.status === 'PENDING' && existing.initiatedById !== viewerId) {
        return this.respondToMatch(viewerId, existing.id, true);
      }
      throw new ConflictException('Təklif artıq göndərilib');
    }

    const [userAId, userBId] = RoommatesRepository.orderPair(viewerId, targetUserId);
    const score = await this.scoreBetween(viewerId, targetUserId);

    const match = await this.repo.createMatch({
      userAId,
      userBId,
      initiatedById: viewerId,
      scoreAtMatch: score,
    });

    await this.notify(targetUserId, 'Yeni otaq yoldaşı təklifi', {
      matchId: match.id,
      fromUserId: viewerId,
      score,
    });

    return this.toMatchDto(match.id, viewerId);
  }

  async respondToMatch(
    viewerId: string,
    matchId: string,
    accept: boolean,
  ): Promise<RoommateMatchDto> {
    const match = await this.repo.findMatchById(matchId);
    if (!match) throw new NotFoundException('Təklif tapılmadı');

    if (match.userAId !== viewerId && match.userBId !== viewerId) {
      throw new ForbiddenException('Bu təklif sizə aid deyil');
    }
    if (match.initiatedById === viewerId) {
      throw new BadRequestException('Öz təklifinizə cavab verə bilməzsiniz');
    }
    if (match.status !== 'PENDING') {
      throw new ConflictException('Bu təklifə artıq cavab verilib');
    }

    await this.repo.updateMatch(matchId, {
      status: accept ? 'ACCEPTED' : 'DECLINED',
      respondedAt: new Date(),
    });

    if (accept) {
      await this.notify(match.initiatedById, 'Otaq yoldaşı təklifiniz qəbul edildi', {
        matchId,
        fromUserId: viewerId,
      });

      /*
        Huni qeydi: qəbul edilmiş təklif otaq yoldaşı tərəfində "əlaqə quruldu"
        anıdır. Əvvəl yalnız elan üzərindən nömrə açılışı sayılırdı, ona görə
        admin panelindəki huni və "nəticə necə oldu?" sorğusu otaq yoldaşı
        axtarışını ÜMUMİYYƏTLƏ görmürdü — platformanın yarısı ölçülməmiş qalırdı.

        Hər iki tərəf üçün yazılır: hansının yaşayış tapdığını əvvəlcədən bilmirik.
        Xəta əsas əməliyyatı dayandırmır — ölçmə uğursuzluğu istifadəçinin
        qəbul etdiyi təklifi geri qaytarmamalıdır.
      */
      await Promise.all([
        this.contacts.recordContact(viewerId, {
          targetUserId: match.initiatedById,
          channel: 'PHONE_REVEAL',
        }),
        this.contacts.recordContact(match.initiatedById, {
          targetUserId: viewerId,
          channel: 'PHONE_REVEAL',
        }),
      ]).catch((error: unknown) => {
        this.logger.warn(`Otaq yoldaşı əlaqə qeydi yazılmadı: ${String(error)}`);
      });
    }

    return this.toMatchDto(matchId, viewerId);
  }

  async listMatches(viewerId: string): Promise<RoommateMatchDto[]> {
    const rows = await this.repo.listMatches(viewerId);

    return rows.map((m) => {
      const partner = m.userAId === viewerId ? m.userB : m.userA;
      return {
        id: m.id,
        status: m.status,
        partner: {
          userId: partner.id,
          fullName: partner.fullName,
          avatarUrl: partner.avatarUrl,
          universityShortName:
            partner.studentProfile?.university?.shortName ?? null,
        },
        scoreAtMatch: m.scoreAtMatch,
        initiatedByMe: m.initiatedById === viewerId,
        createdAt: m.createdAt.toISOString(),
        hasJointSearch: m.jointSearch !== null,
      };
    });
  }

  // =========================================================================

  private async scoreBetween(a: string, b: string): Promise<number | null> {
    const [rowA, rowB] = await Promise.all([this.repo.findProfile(a), this.repo.findProfile(b)]);
    if (!rowA || !rowB) return null;
    const scorer = await this.weights.getScorer();
    return scorer.score(toCandidate(rowA), toCandidate(rowB)).score;
  }

  private async toMatchDto(matchId: string, viewerId: string): Promise<RoommateMatchDto> {
    const all = await this.listMatches(viewerId);
    const found = all.find((m) => m.id === matchId);
    if (!found) throw new NotFoundException('Təklif tapılmadı');
    return found;
  }

  private async notify(
    userId: string,
    _title: string,
    payload: Prisma.InputJsonValue,
  ): Promise<void> {
    await this.prisma.notification
      .create({ data: { userId, type: NotificationType.SISTEM, payload } })
      .catch(() => undefined);
  }
}

// ---------------------------------------------------------------------------
// Çevirmələr
// ---------------------------------------------------------------------------

export function toCandidate(row: RoommateCandidate): MatchCandidate {
  return {
    userId: row.userId,
    // Cins profil anketində ayrıca sahə deyil — cins üstünlüyündən çıxarılır.
    // Profilində "Qadın" seçən istifadəçi qadın otaq yoldaşı axtarır demək deyil,
    // ona görə burada neytral dəyər verilir və sərt filtr yalnız üstünlüyə baxır.
    gender: row.genderPreference === 'KISI' ? 'KISI' : 'QADIN',
    genderPreference: row.genderPreference,
    cityId: row.cityId,
    districtIds: row.preferredDistricts.map((d) => d.districtId),
    universityId: row.universityId,
    lifestyle: row.lifestyle,
    smoking: row.smoking,
    petsAttitude: row.petsAttitude,
    budgetMin: row.budgetMin,
    budgetMax: row.budgetMax,
    roomCount: null,
  };
}

function toCard(
  row: RoommateCandidate,
  matchScore: number | null,
  matchReasons: string[],
  match: { status: string; initiatedById: string } | undefined,
  viewerId: string | undefined,
): RoommateCardDto {
  let matchStatus: RoommateCardDto['matchStatus'] = 'NONE';
  if (match) {
    if (match.status === 'ACCEPTED') matchStatus = 'ACCEPTED';
    else if (match.status === 'DECLINED') matchStatus = 'DECLINED';
    else matchStatus = match.initiatedById === viewerId ? 'PENDING_SENT' : 'PENDING_RECEIVED';
  }

  return {
    userId: row.userId,
    fullName: row.user.fullName,
    avatarUrl: row.user.avatarUrl,
    universityName: row.universityIsPublic ? (row.university?.name ?? null) : null,
    universityShortName: row.universityIsPublic ? (row.university?.shortName ?? null) : null,
    majorName: row.majorIsPublic ? (row.major?.name ?? null) : null,
    cityName: row.city?.name ?? null,
    districtNames: row.preferredDistricts.map((d) => d.district.name),
    // Büdcə gizlidirsə rəqəm göstərilmir, amma skorda iştirak edir.
    budgetMin: row.budgetIsPublic ? row.budgetMin : null,
    budgetMax: row.budgetIsPublic ? row.budgetMax : null,
    lifestyle: row.lifestyleIsPublic ? row.lifestyle : null,
    smoking: row.smokingIsPublic ? row.smoking : null,
    petsAttitude: row.petsAttitudeIsPublic ? row.petsAttitude : null,
    phoneVerified: row.user.phoneVerifiedAt !== null,
    studentVerified: row.user.verifications.some((v) => v.status === 'VERIFIED'),
    matchScore,
    matchReasons,
    matchStatus,
  };
}

export { SCORE_EXPLANATION };
