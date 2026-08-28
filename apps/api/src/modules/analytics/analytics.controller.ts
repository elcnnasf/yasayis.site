import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { answerSurveySchema, recordContactSchema } from '@yasayis/shared';
import { zodBody } from '../../common/pipes/zod-validation.pipe';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators';
import { AnalyticsService } from './analytics.service';

/**
 * Ölçmə hadisələri və nəticə sorğusu.
 *
 * Yalnız hunini qurmaq üçün lazım olan minimum qeyd olunur.
 */
@Controller('me')
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  /** Nömrə açılanda client bunu çağırır — huninin 4-cü addımı. */
  @Post('contacts')
  @HttpCode(HttpStatus.ACCEPTED)
  async recordContact(
    @CurrentUser() actor: AuthUser,
    @Body(zodBody(recordContactSchema)) dto: unknown,
  ) {
    await this.analytics.recordContact(actor.id, dto as never);
    return { recorded: true };
  }

  /** Vaxtı çatmış "nəticə necə oldu?" sorğuları. */
  @Get('surveys')
  pending(@CurrentUser() actor: AuthUser) {
    return this.analytics.pendingSurveys(actor.id);
  }

  @Post('surveys/:id')
  answer(
    @CurrentUser() actor: AuthUser,
    @Param('id') id: string,
    @Body(zodBody(answerSurveySchema)) dto: unknown,
  ) {
    return this.analytics.answerSurvey(actor.id, id, dto as never);
  }

  @Post('surveys/:id/skip')
  @HttpCode(HttpStatus.NO_CONTENT)
  skip(@CurrentUser() actor: AuthUser, @Param('id') id: string) {
    return this.analytics.skipSurvey(actor.id, id);
  }
}
