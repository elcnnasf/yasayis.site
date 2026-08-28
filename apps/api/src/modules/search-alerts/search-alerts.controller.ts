import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post } from '@nestjs/common';
import { Ability, searchAlertSchema } from '@yasayis/shared';
import { zodBody } from '../../common/pipes/zod-validation.pipe';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser, RequireAbility } from '../auth/decorators';
import { SearchAlertsService } from './search-alerts.service';

/** Saxlanmış axtarışlar — dashboard-dakı "Saxladığın axtarışlar" bölməsi. */
@RequireAbility(Ability.SEARCH_ALERT_MANAGE)
@Controller('me/search-alerts')
export class SearchAlertsController {
  constructor(private readonly alerts: SearchAlertsService) {}

  @Get()
  list(@CurrentUser() actor: AuthUser) {
    return this.alerts.list(actor.id);
  }

  @Post()
  create(@CurrentUser() actor: AuthUser, @Body(zodBody(searchAlertSchema)) dto: unknown) {
    return this.alerts.create(actor.id, dto as never);
  }

  @Patch(':id')
  setActive(
    @CurrentUser() actor: AuthUser,
    @Param('id') id: string,
    @Body() body: { isActive?: boolean },
  ) {
    return this.alerts.setActive(actor.id, id, body.isActive !== false);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser() actor: AuthUser, @Param('id') id: string) {
    return this.alerts.remove(actor.id, id);
  }
}
