import { Module } from '@nestjs/common';
import { TaxonomyAdminController } from './taxonomy-admin.controller';
import { TaxonomyController } from './taxonomy.controller';
import { TaxonomyRepository } from './taxonomy.repository';
import { TaxonomyService } from './taxonomy.service';

@Module({
  controllers: [TaxonomyController, TaxonomyAdminController],
  providers: [TaxonomyService, TaxonomyRepository],
  exports: [TaxonomyService],
})
export class TaxonomyModule {}
