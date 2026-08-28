import { Global, Module } from '@nestjs/common';
import { ListingEventsService } from './listing-events.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

/**
 * Qlobaldır: bildiriş yaratmaq ehtiyacı bütün modullarda var
 * (moderasiya, təsdiq, şikayət, elan hadisələri).
 */
@Global()
@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService, ListingEventsService],
  exports: [NotificationsService, ListingEventsService],
})
export class NotificationsModule {}
