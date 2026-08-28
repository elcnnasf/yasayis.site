import { Controller, Get, Param, Query } from '@nestjs/common';
import { taxonomyListQuerySchema } from '@yasayis/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { Public } from '../auth/decorators';
import { TaxonomyService } from './taxonomy.service';

/**
 * Açıq taksonomiya endpoint-ləri — giriş tələb etmir  (PROMPT A2)
 *
 * Bu siyahılar üç yerdə işlənir:
 *   · onboarding formaları (Prompt C1)
 *   · axtarış filtrləri (Prompt D4)
 *   · admin panel (Prompt G2 — yazma üçün ayrı controller)
 *
 * Yalnız aktiv qeydlər qaytarılır; deaktiv edilmişləri görmək admin işidir.
 */
@Public()
@Controller('taxonomy')
export class TaxonomyController {
  constructor(private readonly taxonomy: TaxonomyService) {}

  @Get('cities')
  cities(@Query(new ZodValidationPipe(taxonomyListQuerySchema)) query: { q?: string }) {
    return this.taxonomy.getCities(false, query.q);
  }

  @Get('cities/:slug')
  city(@Param('slug') slug: string) {
    return this.taxonomy.getCityBySlug(slug);
  }

  @Get('districts')
  districts(
    @Query(new ZodValidationPipe(taxonomyListQuerySchema))
    query: { cityId?: string; q?: string },
  ) {
    return this.taxonomy.getDistricts(query.cityId, false, query.q);
  }

  @Get('universities')
  universities(
    @Query(new ZodValidationPipe(taxonomyListQuerySchema))
    query: { cityId?: string; q?: string },
  ) {
    return this.taxonomy.getUniversities(query.cityId, false, query.q);
  }

  /** Statik generasiya üçün bütün şəhər/rayon kombinasiyaları. */
  @Get('seo-routes')
  seoRoutes() {
    return this.taxonomy.getSeoRoutes();
  }

  @Get('majors')
  majors(@Query(new ZodValidationPipe(taxonomyListQuerySchema)) query: { q?: string }) {
    return this.taxonomy.getMajors(false, query.q);
  }
}
