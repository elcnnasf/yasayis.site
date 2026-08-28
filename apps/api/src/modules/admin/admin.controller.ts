import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import {
  Ability,
  adminListingsQuerySchema,
  adminPeriodSchema,
  adminUsersQuerySchema,
  auditQuerySchema,
  deleteListingSchema,
  suspendUserSchema,
} from '@yasayis/shared';
import { ZodValidationPipe, zodBody } from '../../common/pipes/zod-validation.pipe';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser, RequireAbility } from '../auth/decorators';
import { AuditService } from '../audit/audit.service';
import { AdminUsersService } from './admin-users.service';
import { DashboardService } from './dashboard.service';

/**
 * Admin panel  (PROMPT G1 / G2)
 *
 * `ADMIN_PANEL` icazəsi moderatorda da var, amma bloklama və silmə üçün
 * ayrıca icazələr tələb olunur — moderator elanla işləyir, istifadəçi hesabı
 * ilə yox.
 */
@RequireAbility(Ability.ADMIN_PANEL)
@Controller('admin')
export class AdminController {
  constructor(
    private readonly dashboard: DashboardService,
    private readonly users: AdminUsersService,
    private readonly audit: AuditService,
  ) {}

  // --- Dashboard -----------------------------------------------------------

  @Get('metrics')
  metrics(@Query(new ZodValidationPipe(adminPeriodSchema)) q: { days: number }) {
    return this.dashboard.metrics(q.days);
  }

  @Get('funnel')
  funnel(@Query(new ZodValidationPipe(adminPeriodSchema)) q: { days: number }) {
    return this.dashboard.funnel(q.days);
  }

  // --- İstifadəçilər -------------------------------------------------------

  @Get('users')
  listUsers(
    @Query(new ZodValidationPipe(adminUsersQuerySchema))
    query: Parameters<AdminUsersService['listUsers']>[0],
  ) {
    return this.users.listUsers(query);
  }

  @RequireAbility(Ability.USER_SUSPEND)
  @Post('users/:id/suspend')
  suspend(
    @CurrentUser() actor: AuthUser,
    @Param('id') id: string,
    @Body(zodBody(suspendUserSchema)) dto: unknown,
  ) {
    return this.users.setSuspended(id, actor.id, dto as never);
  }

  // --- Elanlar -------------------------------------------------------------

  @Get('listings')
  listListings(
    @Query(new ZodValidationPipe(adminListingsQuerySchema))
    query: Parameters<AdminUsersService['listListings']>[0],
  ) {
    return this.users.listListings(query);
  }

  @RequireAbility(Ability.LISTING_MODERATE)
  @Delete('listings/:id')
  deleteListing(
    @CurrentUser() actor: AuthUser,
    @Param('id') id: string,
    @Body(zodBody(deleteListingSchema)) dto: unknown,
  ) {
    return this.users.deleteListing(id, actor.id, dto as never);
  }

  // --- Audit ---------------------------------------------------------------

  /** "Kim, nə vaxt, nə etdi" — bütün admin əməliyyatları. */
  @Get('audit')
  auditLog(
    @Query(new ZodValidationPipe(auditQuerySchema))
    query: Parameters<AuditService['list']>[0],
  ) {
    return this.audit.list(query);
  }
}
