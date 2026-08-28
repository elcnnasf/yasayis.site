import { Injectable, Logger } from '@nestjs/common';
import type { Prisma } from '@yasayis/db';
import { auditActionLabels, type AuditEntryDto, type AuditQuery } from '@yasayis/shared';
import { PrismaService } from '../../common/prisma/prisma.service';

/**
 * Audit jurnalı.
 *
 * Hər admin əməliyyatı burada iz qoyur: kim, nə vaxt, nə etdi.
 * Yazma HEÇ VAXT əsas əməliyyatı dayandırmır — jurnal yazıla bilməsə,
 * xəta log-a düşür, amma istifadəçi əməliyyatı uğursuz sayılmır.
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async record(entry: {
    actorId: string | null;
    action: string;
    entityType: string;
    entityId: string;
    meta?: Prisma.InputJsonValue;
    ip?: string | null;
  }): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          actorId: entry.actorId,
          action: entry.action,
          entityType: entry.entityType,
          entityId: entry.entityId,
          meta: entry.meta,
          ip: entry.ip?.slice(0, 64) ?? null,
        },
      });
    } catch (error) {
      this.logger.error(`Audit yazılmadı (${entry.action}): ${String(error)}`);
    }
  }

  async list(query: AuditQuery): Promise<{ items: AuditEntryDto[]; total: number }> {
    const where: Prisma.AuditLogWhereInput = {
      ...(query.actorId ? { actorId: query.actorId } : {}),
      ...(query.entityType ? { entityType: query.entityType } : {}),
      ...(query.entityId ? { entityId: query.entityId } : {}),
    };

    const [total, rows] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: { actor: { select: { id: true, fullName: true } } },
      }),
    ]);

    return {
      total,
      items: rows.map((r) => ({
        id: r.id,
        action: r.action,
        actionLabel: auditActionLabels[r.action] ?? r.action,
        entityType: r.entityType,
        entityId: r.entityId,
        actor: r.actor ? { id: r.actor.id, fullName: r.actor.fullName } : null,
        meta: (r.meta as Record<string, unknown> | null) ?? null,
        createdAt: r.createdAt.toISOString(),
      })),
    };
  }
}
