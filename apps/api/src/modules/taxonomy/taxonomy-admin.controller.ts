import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  Ability,
  cityInputSchema,
  cityUpdateSchema,
  districtInputSchema,
  districtUpdateSchema,
  majorInputSchema,
  majorUpdateSchema,
  taxonomyListQuerySchema,
  universityInputSchema,
  universityUpdateSchema,
} from '@yasayis/shared';
import type { Prisma } from '@yasayis/db';
import { ZodValidationPipe, zodBody } from '../../common/pipes/zod-validation.pipe';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser, RequireAbility } from '../auth/decorators';
import { AuditService } from '../audit/audit.service';
import { TaxonomyService } from './taxonomy.service';

/**
 * Taksonomiya idarəetməsi — YALNIZ ADMIN  (PROMPT A2 / G2)
 *
 * Şəhər, rayon, universitet və ixtisas siyahıları kodda sabitlənmir: yeni şəhər
 * əlavə etmək üçün deploy lazım deyil, admin panelindən əlavə olunur.
 *
 * HƏR yazma əməliyyatı audit jurnalına düşür — "kim, nə vaxt, nə etdi"
 * sualına cavab verilə bilməlidir.
 */
@RequireAbility(Ability.TAXONOMY_MANAGE)
@Controller('admin/taxonomy')
export class TaxonomyAdminController {
  constructor(
    private readonly taxonomy: TaxonomyService,
    private readonly audit: AuditService,
  ) {}

  private log(
    actorId: string,
    action: 'taxonomy.create' | 'taxonomy.update' | 'taxonomy.delete',
    entityType: string,
    entityId: string,
    input?: unknown,
  ): Promise<void> {
    return this.audit.record({
      actorId,
      action,
      entityType,
      entityId,
      meta: { input: (input ?? null) as Prisma.InputJsonValue },
    });
  }

  // --- Şəhər ---------------------------------------------------------------

  /** Admin deaktiv edilmiş qeydləri də görməlidir. */
  @Get('cities')
  cities(@Query(new ZodValidationPipe(taxonomyListQuerySchema)) q: { q?: string }) {
    return this.taxonomy.getCities(true, q.q);
  }

  @Post('cities')
  async createCity(
    @CurrentUser() actor: AuthUser,
    @Body(zodBody(cityInputSchema)) dto: unknown,
  ) {
    const created = await this.taxonomy.createCity(dto as never);
    await this.log(actor.id, 'taxonomy.create', 'City', created.id, dto);
    return created;
  }

  @Patch('cities/:id')
  async updateCity(
    @CurrentUser() actor: AuthUser,
    @Param('id') id: string,
    @Body(zodBody(cityUpdateSchema)) dto: unknown,
  ) {
    const updated = await this.taxonomy.updateCity(id, dto as never);
    await this.log(actor.id, 'taxonomy.update', 'City', id, dto);
    return updated;
  }

  @Delete('cities/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteCity(@CurrentUser() actor: AuthUser, @Param('id') id: string) {
    await this.taxonomy.deleteCity(id);
    await this.log(actor.id, 'taxonomy.delete', 'City', id);
  }

  // --- Rayon ---------------------------------------------------------------

  @Get('districts')
  districts(
    @Query(new ZodValidationPipe(taxonomyListQuerySchema)) q: { cityId?: string; q?: string },
  ) {
    return this.taxonomy.getDistricts(q.cityId, true, q.q);
  }

  @Post('districts')
  async createDistrict(
    @CurrentUser() actor: AuthUser,
    @Body(zodBody(districtInputSchema)) dto: unknown,
  ) {
    const created = await this.taxonomy.createDistrict(dto as never);
    await this.log(actor.id, 'taxonomy.create', 'District', created.id, dto);
    return created;
  }

  @Patch('districts/:id')
  async updateDistrict(
    @CurrentUser() actor: AuthUser,
    @Param('id') id: string,
    @Body(zodBody(districtUpdateSchema)) dto: unknown,
  ) {
    const updated = await this.taxonomy.updateDistrict(id, dto as never);
    await this.log(actor.id, 'taxonomy.update', 'District', id, dto);
    return updated;
  }

  @Delete('districts/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteDistrict(@CurrentUser() actor: AuthUser, @Param('id') id: string) {
    await this.taxonomy.deleteDistrict(id);
    await this.log(actor.id, 'taxonomy.delete', 'District', id);
  }

  // --- Universitet ---------------------------------------------------------

  @Get('universities')
  universities(
    @Query(new ZodValidationPipe(taxonomyListQuerySchema)) q: { cityId?: string; q?: string },
  ) {
    return this.taxonomy.getUniversities(q.cityId, true, q.q);
  }

  @Post('universities')
  async createUniversity(
    @CurrentUser() actor: AuthUser,
    @Body(zodBody(universityInputSchema)) dto: unknown,
  ) {
    const created = await this.taxonomy.createUniversity(dto as never);
    await this.log(actor.id, 'taxonomy.create', 'University', created.id, dto);
    return created;
  }

  @Patch('universities/:id')
  async updateUniversity(
    @CurrentUser() actor: AuthUser,
    @Param('id') id: string,
    @Body(zodBody(universityUpdateSchema)) dto: unknown,
  ) {
    const updated = await this.taxonomy.updateUniversity(id, dto as never);
    await this.log(actor.id, 'taxonomy.update', 'University', id, dto);
    return updated;
  }

  @Delete('universities/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteUniversity(@CurrentUser() actor: AuthUser, @Param('id') id: string) {
    await this.taxonomy.deleteUniversity(id);
    await this.log(actor.id, 'taxonomy.delete', 'University', id);
  }

  // --- İxtisas -------------------------------------------------------------

  @Get('majors')
  majors(@Query(new ZodValidationPipe(taxonomyListQuerySchema)) q: { q?: string }) {
    return this.taxonomy.getMajors(true, q.q);
  }

  @Post('majors')
  async createMajor(
    @CurrentUser() actor: AuthUser,
    @Body(zodBody(majorInputSchema)) dto: unknown,
  ) {
    const created = await this.taxonomy.createMajor(dto as never);
    await this.log(actor.id, 'taxonomy.create', 'Major', created.id, dto);
    return created;
  }

  @Patch('majors/:id')
  async updateMajor(
    @CurrentUser() actor: AuthUser,
    @Param('id') id: string,
    @Body(zodBody(majorUpdateSchema)) dto: unknown,
  ) {
    const updated = await this.taxonomy.updateMajor(id, dto as never);
    await this.log(actor.id, 'taxonomy.update', 'Major', id, dto);
    return updated;
  }

  @Delete('majors/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteMajor(@CurrentUser() actor: AuthUser, @Param('id') id: string) {
    await this.taxonomy.deleteMajor(id);
    await this.log(actor.id, 'taxonomy.delete', 'Major', id);
  }
}
