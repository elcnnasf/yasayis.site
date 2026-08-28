import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationType, type Prisma } from '@yasayis/db';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { Env } from '../../config/env';

export interface NotificationInput {
  userId: string;
  type: NotificationType;
  payload?: Prisma.InputJsonValue;
  /** E-poçt da göndərilsin — yalnız vacib hadisələr üçün. */
  email?: { subject: string; body: string };
}

/**
 * Bildiriş infrastrukturu  (PROMPT I2)
 *
 * İki kanal var: **in-app** (həmişə) və **e-poçt** (yalnız vacib hadisələr).
 * Push kanalı gələcək fazaya saxlanılıb — `Notification` cədvəlində
 * `emailedAt` sahəsi var, push əlavə olunanda yalnız bir sütun artacaq.
 *
 * Bildiriş yazmaq HEÇ VAXT əsas əməliyyatı dayandırmır: xəta log-a düşür,
 * amma elan təsdiqi və ya qiymət dəyişikliyi geri qaytarılmır.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async create(input: NotificationInput): Promise<void> {
    try {
      const notification = await this.prisma.notification.create({
        data: {
          userId: input.userId,
          type: input.type,
          payload: input.payload,
        },
      });

      if (input.email) {
        await this.sendEmail(notification.id, input.userId, input.email);
      }
    } catch (error) {
      this.logger.error(`Bildiriş yazılmadı (${input.type}): ${String(error)}`);
    }
  }

  /** Toplu göndərmə — uyğun elan çıxanda onlarla istifadəçiyə gedir. */
  async createMany(inputs: NotificationInput[]): Promise<number> {
    if (inputs.length === 0) return 0;

    try {
      const result = await this.prisma.notification.createMany({
        data: inputs.map((i) => ({
          userId: i.userId,
          type: i.type,
          payload: i.payload,
        })),
      });
      return result.count;
    } catch (error) {
      this.logger.error(`Toplu bildiriş yazılmadı: ${String(error)}`);
      return 0;
    }
  }

  // =========================================================================
  //  Oxuma
  // =========================================================================

  list(userId: string, onlyUnread = false) {
    return this.prisma.notification.findMany({
      where: { userId, ...(onlyUnread ? { readAt: null } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  unreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({ where: { userId, readAt: null } });
  }

  async markRead(userId: string, id: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { id, userId, readAt: null },
      data: { readAt: new Date() },
    });
  }

  async markAllRead(userId: string): Promise<{ count: number }> {
    const result = await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { count: result.count };
  }

  // =========================================================================
  //  E-poçt kanalı
  // =========================================================================

  /**
   * E-poçt göndərmə.
   *
   * Dev-də log-a yazılır — SMS provayderi ilə eyni yanaşma. Real provayder
   * qoşulanda yalnız bu metod dəyişəcək.
   */
  private async sendEmail(
    notificationId: string,
    userId: string,
    email: { subject: string; body: string },
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, fullName: true },
    });

    if (!user?.email) return;

    const provider = this.config.get('EMAIL_PROVIDER', { infer: true });

    if (provider === 'console') {
      this.logger.warn(`[E-POÇT → ${user.email}] ${email.subject}`);
    } else {
      // Real provayder buraya qoşulacaq (Resend, Postmark və s.).
      this.logger.warn('EMAIL_PROVIDER "http" seçilib, amma inteqrasiya hələ yoxdur');
      return;
    }

    await this.prisma.notification
      .update({ where: { id: notificationId }, data: { emailedAt: new Date() } })
      .catch(() => undefined);
  }
}
