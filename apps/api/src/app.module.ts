import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './common/prisma/prisma.module';
import { validateEnv } from './config/env';
import { AuthGuard } from './modules/auth/auth.guard';
import { AuthModule } from './modules/auth/auth.module';
import { AdminModule } from './modules/admin/admin.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { AuditModule } from './modules/audit/audit.module';
import { FavoritesModule } from './modules/favorites/favorites.module';
import { HealthController } from './modules/health/health.controller';
import { MessagesModule } from './modules/messages/messages.module';
import { ListingsModule } from './modules/listings/listings.module';
import { MediaModule } from './modules/media/media.module';
import { MatchingModule } from './modules/matching/matching.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ProfilesModule } from './modules/profiles/profiles.module';
import { ReportsModule } from './modules/reports/reports.module';
import { RoommatesModule } from './modules/roommates/roommates.module';
import { SearchAlertsModule } from './modules/search-alerts/search-alerts.module';
import { VerificationsModule } from './modules/verifications/verifications.module';
import { SmsModule } from './modules/sms/sms.module';
import { TaxonomyModule } from './modules/taxonomy/taxonomy.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../../.env', '.env'],
      validate: validateEnv,
    }),
    // Ümumi qoruma. Endpoint-ə xas limitlər (login, OTP) @Throttle ilə ayrıca verilir.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    // Elan müddəti və xatırlatmalar üçün gündəlik cron.
    ScheduleModule.forRoot(),
    PrismaModule,
    SmsModule,
    AuthModule,
    TaxonomyModule,
    ProfilesModule,
    MediaModule,
    ListingsModule,
    MessagesModule,
    MatchingModule,
    RoommatesModule,
    FavoritesModule,
    SearchAlertsModule,
    ReportsModule,
    VerificationsModule,
    AuditModule,
    NotificationsModule,
    AnalyticsModule,
    AdminModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    // Auth guard qlobaldır: hər endpoint default olaraq qorunur,
    // açıq olanlar @Public() ilə işarələnir.
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
})
export class AppModule {}
