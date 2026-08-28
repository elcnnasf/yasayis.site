import { Module } from '@nestjs/common';
import { SearchAlertsController } from './search-alerts.controller';
import { SearchAlertsService } from './search-alerts.service';

@Module({
  controllers: [SearchAlertsController],
  providers: [SearchAlertsService],
})
export class SearchAlertsModule {}
