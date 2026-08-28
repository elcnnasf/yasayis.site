import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { NotificationType, ReportStatus, ReportTarget } from '@yasayis/db';
import type {
  CreateReportInput,
  ReportDto,
  ReportQuery,
  ResolveReportInput,
} from '@yasayis/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

/**
 * Şikayətlər  (PROMPT F3)
 *
 * İki hədəf var: elan və istifadəçi/profil. İkincisi otaq yoldaşı
 * təhlükəsizliyi üçün vacibdir — problem çox vaxt elanda deyil, şəxsdədir.
 *
 * Hər iki növ eyni moderasiya növbəsinə düşür (Prompt G2 həmin növbəni
 * admin panelində göstərəcək).
 */
@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(reporterId: string, input: CreateReportInput): Promise<{ id: string }> {
    await this.assertTargetExists(input.targetType, input.targetId);

    if (input.targetType === ReportTarget.USER && input.targetId === reporterId) {
      throw new BadRequestException('Özünüzü şikayət edə bilməzsiniz');
    }

    // Eyni istifadəçinin eyni hədəf üzrə açıq şikayəti varsa, təkrar yaradılmır.
    const existing = await this.prisma.report.findFirst({
      where: {
        reporterId,
        targetType: input.targetType,
        targetId: input.targetId,
        status: { in: [ReportStatus.OPEN, ReportStatus.REVIEWING] },
      },
      select: { id: true },
    });
    if (existing) return { id: existing.id };

    const report = await this.prisma.report.create({
      data: {
        reporterId,
        targetType: input.targetType,
        targetId: input.targetId,
        reason: input.reason,
        comment: input.comment ?? null,
      },
      select: { id: true },
    });

    return report;
  }

  /** Moderasiya növbəsi. */
  async list(query: ReportQuery): Promise<ReportDto[]> {
    const rows = await this.prisma.report.findMany({
      where: {
        ...(query.status ? { status: query.status } : {}),
        ...(query.targetType ? { targetType: query.targetType } : {}),
      },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      take: 200,
      include: { reporter: { select: { id: true, fullName: true } } },
    });

    // Hədəf adları toplu şəkildə oxunur — sətir-sətir sorğu vurmamaq üçün.
    const listingIds = rows
      .filter((r) => r.targetType === ReportTarget.LISTING)
      .map((r) => r.targetId);
    const userIds = rows
      .filter((r) => r.targetType === ReportTarget.USER)
      .map((r) => r.targetId);

    const [listings, users] = await Promise.all([
      listingIds.length
        ? this.prisma.listing.findMany({
            where: { id: { in: listingIds } },
            select: { id: true, slug: true, property: { select: { title: true } } },
          })
        : [],
      userIds.length
        ? this.prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, fullName: true },
          })
        : [],
    ]);

    const listingMap = new Map(listings.map((l) => [l.id, l]));
    const userMap = new Map(users.map((u) => [u.id, u]));

    return rows.map((r) => {
      const listing = listingMap.get(r.targetId);
      const user = userMap.get(r.targetId);

      return {
        id: r.id,
        targetType: r.targetType,
        targetId: r.targetId,
        targetLabel:
          r.targetType === ReportTarget.LISTING
            ? (listing?.property.title ?? null)
            : (user?.fullName ?? null),
        targetSlug: listing?.slug ?? null,
        reason: r.reason,
        comment: r.comment,
        status: r.status,
        reporter: { id: r.reporter.id, fullName: r.reporter.fullName },
        resolutionNote: r.resolutionNote,
        createdAt: r.createdAt.toISOString(),
        resolvedAt: r.resolvedAt?.toISOString() ?? null,
      };
    });
  }

  async resolve(
    reportId: string,
    reviewerId: string,
    input: ResolveReportInput,
  ): Promise<{ id: string; status: ReportStatus }> {
    const report = await this.prisma.report.findUnique({ where: { id: reportId } });
    if (!report) throw new NotFoundException('Şikayət tapılmadı');

    const closing =
      input.status === ReportStatus.RESOLVED || input.status === ReportStatus.DISMISSED;

    const updated = await this.prisma.report.update({
      where: { id: reportId },
      data: {
        status: input.status,
        reviewedById: reviewerId,
        resolutionNote: input.resolutionNote ?? null,
        resolvedAt: closing ? new Date() : null,
      },
      select: { id: true, status: true },
    });

    // Şikayət bağlananda şikayət edən nəticəni bilməlidir.
    if (closing) {
      await this.prisma.notification
        .create({
          data: {
            userId: report.reporterId,
            type: NotificationType.SIKAYET_NETICESI,
            payload: {
              reportId,
              status: input.status,
              note: input.resolutionNote ?? null,
            },
          },
        })
        .catch(() => undefined);
    }

    await this.audit.record({
      actorId: reviewerId,
      action:
        input.status === ReportStatus.RESOLVED
          ? 'report.resolve'
          : input.status === ReportStatus.DISMISSED
            ? 'report.dismiss'
            : 'report.review',
      entityType: 'Report',
      entityId: reportId,
      meta: {
        targetType: report.targetType,
        targetId: report.targetId,
        reason: report.reason,
        note: input.resolutionNote ?? null,
      },
    });

    return updated;
  }

  private async assertTargetExists(target: ReportTarget, id: string): Promise<void> {
    const count =
      target === ReportTarget.LISTING
        ? await this.prisma.listing.count({ where: { id } })
        : await this.prisma.user.count({ where: { id, deletedAt: null } });

    if (count === 0) {
      throw new NotFoundException(
        target === ReportTarget.LISTING ? 'Elan tapılmadı' : 'İstifadəçi tapılmadı',
      );
    }
  }
}
