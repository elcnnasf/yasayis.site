import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NotificationType, SurveyStatus } from '@yasayis/db';
import type {
  AnswerSurveyInput,
  PendingSurveyDto,
  RecordContactInput,
} from '@yasayis/shared';
import { PrismaService } from '../../common/prisma/prisma.service';

/**
 * Ölçmə hadisələri və nəticə sorğusu  (PROMPT G1)
 *
 * Platformada ödəniş və daxili chat yoxdur, ona görə "bu adam həqiqətən
 * yaşayış tapdımı?" sualına sistem özü cavab verə bilmir. Yeganə real yol —
 * əlaqədən bir neçə gün sonra istifadəçinin özündən soruşmaqdır.
 *
 * Axın: əlaqə təşəbbüsü qeyd olunur → 3 gün sonra sorğu "göndərilir" →
 * istifadəçi üç variantdan birini seçir → KPI hesablanır.
 */
@Injectable()
export class AnalyticsService {
  /** Əlaqədən neçə gün sonra soruşulur. */
  private static readonly SURVEY_DELAY_DAYS = 3;
  /** Bu qədər gündən sonra cavab gözlənilmir. */
  private static readonly SURVEY_EXPIRY_DAYS = 14;

  private readonly logger = new Logger(AnalyticsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // =========================================================================
  //  Hadisə qeydi
  // =========================================================================

  /**
   * Axtarış hadisəsi.
   * Əsas sorğunu gözlətməmək üçün "unut və davam et" prinsipi ilə yazılır.
   */
  recordSearch(data: {
    userId?: string;
    cityId?: string;
    query?: string;
    resultCount: number;
  }): void {
    this.prisma.searchEvent
      .create({
        data: {
          userId: data.userId ?? null,
          cityId: data.cityId ?? null,
          query: data.query?.slice(0, 120) ?? null,
          resultCount: data.resultCount,
        },
      })
      .catch((error: unknown) => {
        this.logger.warn(`Axtarış hadisəsi yazılmadı: ${String(error)}`);
      });
  }

  /**
   * Əlaqə təşəbbüsü + gələcək sorğunun planlaşdırılması.
   *
   * Eyni hədəf üçün təkrar qeyd yaranmır — istifadəçi nömrəyə iki dəfə
   * baxanda huni şişməsin.
   */
  /** Bu istifadəçi həmin elana görə artıq əlaqə saxlayıbmı? */
  hasContacted(
    initiatorId: string,
    targetUserId: string,
    listingId: string | null,
  ): Promise<boolean> {
    return this.prisma.contactEvent
      .findFirst({
        where: { initiatorId, targetUserId, listingId },
        select: { id: true },
      })
      .then((row) => row !== null);
  }

  /** Verilmiş andan bəri neçə fərqli əlaqə qurulub — gündəlik limit üçün. */
  countSince(initiatorId: string, since: Date): Promise<number> {
    return this.prisma.contactEvent.count({
      where: { initiatorId, createdAt: { gte: since } },
    });
  }

  async recordContact(initiatorId: string, input: RecordContactInput): Promise<void> {
    // Kompozit unikal açarda `listingId` nullable-dır və Postgres NULL-ları
    // fərqli sayır, ona görə təkrar yoxlaması burada aparılır.
    const existing = await this.prisma.contactEvent.findFirst({
      where: {
        initiatorId,
        targetUserId: input.targetUserId,
        listingId: input.listingId ?? null,
      },
      select: { id: true },
    });
    if (existing) return;

    const dueAt = new Date(
      Date.now() + AnalyticsService.SURVEY_DELAY_DAYS * 86_400_000,
    );

    await this.prisma.contactEvent.create({
      data: {
        initiatorId,
        targetUserId: input.targetUserId,
        listingId: input.listingId ?? null,
        channel: input.channel,
        // Sorğu elə indi planlaşdırılır — sonra ayrıca iş tələb etmir.
        survey: { create: { userId: initiatorId, dueAt } },
      },
    });
  }

  // =========================================================================
  //  Nəticə sorğusu
  // =========================================================================

  /** İstifadəçiyə göstəriləcək sorğu — vaxtı çatmış və cavabsız. */
  async pendingSurveys(userId: string): Promise<PendingSurveyDto[]> {
    const rows = await this.prisma.outcomeSurvey.findMany({
      where: {
        userId,
        status: { in: [SurveyStatus.PENDING, SurveyStatus.SENT] },
        dueAt: { lte: new Date() },
      },
      orderBy: { dueAt: 'asc' },
      take: 3,
      include: {
        contactEvent: {
          include: {
            listing: { select: { slug: true, property: { select: { title: true } } } },
            targetUser: { select: { fullName: true } },
          },
        },
      },
    });

    return rows.map((s) => ({
      id: s.id,
      subject:
        s.contactEvent.listing?.property.title ?? s.contactEvent.targetUser.fullName,
      listingSlug: s.contactEvent.listing?.slug ?? null,
      contactedAt: s.contactEvent.createdAt.toISOString(),
    }));
  }

  async answerSurvey(
    userId: string,
    surveyId: string,
    input: AnswerSurveyInput,
  ): Promise<{ id: string }> {
    const survey = await this.prisma.outcomeSurvey.findFirst({
      where: { id: surveyId, userId },
      select: { id: true, status: true },
    });
    if (!survey) throw new NotFoundException('Sorğu tapılmadı');

    await this.prisma.outcomeSurvey.update({
      where: { id: surveyId },
      data: {
        status: SurveyStatus.ANSWERED,
        outcome: input.outcome,
        answeredAt: new Date(),
      },
    });

    return { id: surveyId };
  }

  /** İstifadəçi cavab vermək istəmir — bir daha soruşulmur. */
  async skipSurvey(userId: string, surveyId: string): Promise<void> {
    await this.prisma.outcomeSurvey.updateMany({
      where: { id: surveyId, userId },
      data: { status: SurveyStatus.SKIPPED },
    });
  }

  /**
   * Gündəlik: vaxtı çatan sorğular üçün bildiriş göndərir və
   * çox köhnələnləri bağlayır.
   */
  @Cron(CronExpression.EVERY_DAY_AT_10AM, { name: 'outcome-surveys' })
  async runSurveyCycle(): Promise<void> {
    try {
      const sent = await this.dispatchDueSurveys();
      const closed = await this.expireOldSurveys();
      if (sent || closed) {
        this.logger.log(`Nəticə sorğusu: ${sent} göndərildi, ${closed} bağlandı`);
      }
    } catch (error) {
      this.logger.error(`Sorğu dövrü işləmədi: ${String(error)}`);
    }
  }

  private async dispatchDueSurveys(): Promise<number> {
    const due = await this.prisma.outcomeSurvey.findMany({
      where: { status: SurveyStatus.PENDING, dueAt: { lte: new Date() } },
      take: 500,
      include: {
        contactEvent: {
          include: {
            listing: { select: { slug: true, property: { select: { title: true } } } },
            targetUser: { select: { fullName: true } },
          },
        },
      },
    });

    for (const survey of due) {
      await this.prisma.$transaction([
        this.prisma.outcomeSurvey.update({
          where: { id: survey.id },
          data: { status: SurveyStatus.SENT, sentAt: new Date() },
        }),
        this.prisma.notification.create({
          data: {
            userId: survey.userId,
            type: NotificationType.SISTEM,
            payload: {
              kind: 'OUTCOME_SURVEY',
              surveyId: survey.id,
              question: 'Nəticə necə oldu?',
              subject:
                survey.contactEvent.listing?.property.title ??
                survey.contactEvent.targetUser.fullName,
            },
          },
        }),
      ]);
    }

    return due.length;
  }

  private async expireOldSurveys(): Promise<number> {
    const cutoff = new Date(
      Date.now() - AnalyticsService.SURVEY_EXPIRY_DAYS * 86_400_000,
    );
    const result = await this.prisma.outcomeSurvey.updateMany({
      where: { status: { in: [SurveyStatus.PENDING, SurveyStatus.SENT] }, dueAt: { lt: cutoff } },
      data: { status: SurveyStatus.SKIPPED },
    });
    return result.count;
  }
}
