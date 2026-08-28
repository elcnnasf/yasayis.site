import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@yasayis/db';

/**
 * Prisma-ya yeganə giriş nöqtəsi.
 *
 * Repository-lərdən başqa heç bir yer bunu inject etməməlidir: service təbəqəsi
 * sorğu yazmır, repository çağırır.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit(): Promise<void> {
    try {
      await this.$connect();
      this.logger.log('Bazaya qoşuldu');
    } catch (error) {
      // Prod-da yanlış konfiqurasiya ilə işə düşmək qadağandır — dərhal dayanır.
      if (process.env.NODE_ENV === 'production') throw error;

      // Dev-də isə baza hazır olmadan da API qalxa bilər: `/health` "degraded"
      // qaytarır və developer nəyin çatışmadığını dərhal görür.
      this.logger.warn(
        'Bazaya qoşulmaq alınmadı — API bazasız işə düşdü (yalnız development). ' +
          '.env faylında DATABASE_URL / DIRECT_URL dəyərlərini yoxlayın.',
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
