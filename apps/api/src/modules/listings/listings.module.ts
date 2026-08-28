import { Module } from '@nestjs/common';
import { ListingLifecycleService } from './listing-lifecycle.service';
import { ListingSearchService } from './listing-search.service';
import { ListingsController } from './listings.controller';
import { ListingsRepository } from './listings.repository';
import { ListingsService } from './listings.service';

@Module({
  controllers: [ListingsController],
  providers: [
    ListingsService,
    ListingsRepository,
    ListingSearchService,
    ListingLifecycleService,
  ],
  exports: [ListingsService, ListingLifecycleService, ListingSearchService],
})
export class ListingsModule {}
