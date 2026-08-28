import { Global, Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';

/**
 * Qlobaldır: axtarış hadisəsini elan modulu, əlaqə hadisəsini isə
 * client çağırır — hər ikisi eyni servisdən istifadə edir.
 */
@Global()
@Module({
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
