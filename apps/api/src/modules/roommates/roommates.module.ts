import { Module } from '@nestjs/common';
import { ListingsModule } from '../listings/listings.module';
import { MatchingModule } from '../matching/matching.module';
import { JointSearchService } from './joint-search.service';
import { RoommatesController } from './roommates.controller';
import { RoommatesRepository } from './roommates.repository';
import { RoommatesService } from './roommates.service';

@Module({
  imports: [MatchingModule, ListingsModule],
  controllers: [RoommatesController],
  providers: [RoommatesService, RoommatesRepository, JointSearchService],
  exports: [RoommatesService],
})
export class RoommatesModule {}
