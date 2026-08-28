import { Injectable } from '@nestjs/common';
import { ListingStatus, ReportStatus, SurveyOutcome, SurveyStatus, UserStatus } from '@yasayis/db';
import type { AdminMetricsDto, FunnelDto } from '@yasayis/shared';
import { PrismaService } from '../../common/prisma/prisma.service';

/**
 * Admin KPI-ları və konversiya hunisi  (PROMPT G1)
 *
 * Sayğaclar iki qrupa bölünür:
 *   · vəziyyət metrikləri (neçə aktiv elan var) — dövrdən asılı deyil;
 *   · aktivlik metrikləri (neçə axtarış oldu) — seçilmiş dövrə aiddir.
 *
 * Huni HADİSƏ deyil, İSTİFADƏÇİ sayır: eyni adam 50 axtarış etsə də,
 * "axtarış edənlər" addımında bir dəfə sayılır. Əks halda konversiya faizi
 * mənasız olur.
 */
@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async metrics(days: number): Promise<AdminMetricsDto> {
    const from = new Date(Date.now() - days * 86_400_000);
    const since = { gte: from };

    const [
      totalUsers,
      students,
      owners,
      suspendedUsers,
      active,
      pending,
      rejected,
      expired,
      suspendedListings,
      deleted,
      reportedListings,
      roommateProfiles,
      visibleProfiles,
      matches,
      acceptedMatches,
      searches,
      favorites,
      contacts,
      openReports,
      reviewingReports,
      resolvedReports,
    ] = await Promise.all([
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.user.count({ where: { deletedAt: null, isStudent: true } }),
      this.prisma.user.count({ where: { deletedAt: null, isOwner: true } }),
      this.prisma.user.count({ where: { status: UserStatus.SUSPENDED } }),

      this.prisma.listing.count({ where: { status: ListingStatus.ACTIVE } }),
      this.prisma.listing.count({ where: { status: ListingStatus.PENDING } }),
      this.prisma.listing.count({ where: { status: ListingStatus.REJECTED } }),
      this.prisma.listing.count({ where: { status: ListingStatus.EXPIRED } }),
      this.prisma.listing.count({ where: { status: ListingStatus.SUSPENDED } }),
      this.prisma.property.count({ where: { deletedAt: { not: null } } }),
      // Şikayət olunan elanların TƏKRARSIZ sayı — bir elana 5 şikayət
      // gəlsə də, bu rəqəm 1 artır.
      this.prisma.report
        .findMany({
          where: { targetType: 'LISTING' },
          select: { targetId: true },
          distinct: ['targetId'],
        })
        .then((rows) => rows.length),

      this.prisma.roommateProfile.count(),
      this.prisma.roommateProfile.count({ where: { active: true, visible: true } }),
      this.prisma.roommateMatch.count(),
      this.prisma.roommateMatch.count({ where: { status: 'ACCEPTED' } }),

      this.prisma.searchEvent.count({ where: { createdAt: since } }),
      this.prisma.favorite.count({ where: { createdAt: since } }),
      this.prisma.contactEvent.count({ where: { createdAt: since } }),

      this.prisma.report.count({ where: { status: ReportStatus.OPEN } }),
      this.prisma.report.count({ where: { status: ReportStatus.REVIEWING } }),
      this.prisma.report.count({ where: { status: ReportStatus.RESOLVED } }),
    ]);

    return {
      users: { total: totalUsers, students, owners, suspended: suspendedUsers },
      listings: {
        active,
        pending,
        rejected,
        expired,
        suspended: suspendedListings,
        deleted,
        reported: reportedListings,
      },
      roommates: {
        profiles: roommateProfiles,
        visible: visibleProfiles,
        matches,
        accepted: acceptedMatches,
      },
      activity: { searches, favorites, contacts },
      reports: { open: openReports, reviewing: reviewingReports, resolved: resolvedReports },
      period: { days, from: from.toISOString(), to: new Date().toISOString() },
    };
  }

  /**
   * Konversiya hunisi.
   *
   * Addımlar: qeydiyyat → profil tamamlama → axtarış/baxış → əlaqə təşəbbüsü
   * → nəticənin bildirilməsi.
   *
   * Son addım avtomatik ölçülə bilmədiyi üçün pulse-sorğunun cavabları
   * işlədilir — "uğurlu yaşayış bağlantısı" KPI-sı buradan çıxır.
   */
  async funnel(days: number): Promise<FunnelDto> {
    const from = new Date(Date.now() - days * 86_400_000);

    const [registered, profileCompleted, searchers, contacters, responders, outcomes] =
      await Promise.all([
        this.prisma.user.count({ where: { deletedAt: null, createdAt: { gte: from } } }),

        // "Profil tamamlandı" = onboardingin bütün addımları keçilib.
        this.prisma.user.count({
          where: { deletedAt: null, createdAt: { gte: from }, onboardedAt: { not: null } },
        }),

        // Təkrarsız axtarış edən istifadəçilər (qonaq axtarışları sayılmır —
        // onların hunidə yeri yoxdur, çünki qeydiyyatdan keçməyiblər).
        this.prisma.searchEvent
          .findMany({
            where: { createdAt: { gte: from }, userId: { not: null } },
            select: { userId: true },
            distinct: ['userId'],
          })
          .then((rows) => rows.length),

        this.prisma.contactEvent
          .findMany({
            where: { createdAt: { gte: from } },
            select: { initiatorId: true },
            distinct: ['initiatorId'],
          })
          .then((rows) => rows.length),

        this.prisma.outcomeSurvey
          .findMany({
            where: { status: SurveyStatus.ANSWERED, answeredAt: { gte: from } },
            select: { userId: true },
            distinct: ['userId'],
          })
          .then((rows) => rows.length),

        this.prisma.outcomeSurvey.groupBy({
          by: ['outcome'],
          where: { status: SurveyStatus.ANSWERED, answeredAt: { gte: from } },
          _count: { _all: true },
        }),
      ]);

    const countOf = (outcome: SurveyOutcome) =>
      outcomes.find((o) => o.outcome === outcome)?._count._all ?? 0;

    const found = countOf(SurveyOutcome.TAPDIM);
    const stillLooking = countOf(SurveyOutcome.HELE_AXTARIRAM);
    const noReply = countOf(SurveyOutcome.CAVAB_ALMADIM);
    const answered = found + stillLooking + noReply;

    const raw = [
      { key: 'registered' as const, label: 'Qeydiyyat', count: registered },
      { key: 'profileCompleted' as const, label: 'Profil tamamlandı', count: profileCompleted },
      { key: 'searched' as const, label: 'Axtarış / baxış', count: searchers },
      { key: 'contacted' as const, label: 'Əlaqə təşəbbüsü', count: contacters },
      { key: 'reported' as const, label: 'Nəticə bildirildi', count: responders },
    ];

    const start = raw[0]?.count ?? 0;

    return {
      steps: raw.map((step, index) => {
        const previous = index === 0 ? step.count : (raw[index - 1]?.count ?? 0);
        return {
          ...step,
          conversionFromPrevious: previous > 0 ? Math.round((step.count / previous) * 100) : 0,
          conversionFromStart: start > 0 ? Math.round((step.count / start) * 100) : 0,
        };
      }),
      outcomes: { found, stillLooking, noReply },
      // Yalnız cavab verənlər arasında hesablanır — cavabsızları "uğursuz"
      // saymaq göstəricini süni şəkildə aşağı salardı.
      successRate: answered > 0 ? Math.round((found / answered) * 100) : 0,
    };
  }
}
