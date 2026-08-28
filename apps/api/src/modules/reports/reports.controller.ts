import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  Ability,
  createReportSchema,
  RATE_LIMIT,
  reportQuerySchema,
  resolveReportSchema,
} from '@yasayis/shared';
import { ZodValidationPipe, zodBody } from '../../common/pipes/zod-validation.pipe';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser, RequireAbility } from '../auth/decorators';
import { ReportsService } from './reports.service';

/** İstifadəçi şikayəti — həm elan, həm profil üçün eyni endpoint. */
@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @RequireAbility(Ability.REPORT_CREATE)
  @Post()
  @Throttle({
    default: {
      limit: RATE_LIMIT.REPORT_CREATE.limit,
      ttl: RATE_LIMIT.REPORT_CREATE.ttlSec * 1000,
    },
  })
  create(@CurrentUser() actor: AuthUser, @Body(zodBody(createReportSchema)) dto: unknown) {
    return this.reports.create(actor.id, dto as never);
  }
}

/** Moderasiya növbəsi (Prompt G2 admin panelini bunun üzərində quracaq). */
@RequireAbility(Ability.REPORT_REVIEW)
@Controller('admin/reports')
export class ReportsAdminController {
  constructor(private readonly reports: ReportsService) {}

  @Get()
  list(@Query(new ZodValidationPipe(reportQuerySchema)) query: Parameters<ReportsService['list']>[0]) {
    return this.reports.list(query);
  }

  @Patch(':id')
  resolve(
    @CurrentUser() actor: AuthUser,
    @Param('id') id: string,
    @Body(zodBody(resolveReportSchema)) dto: unknown,
  ) {
    return this.reports.resolve(id, actor.id, dto as never);
  }
}
