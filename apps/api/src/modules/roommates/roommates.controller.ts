import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import {
  Ability,
  jointSearchSchema,
  pageQuerySchema,
  requestMatchSchema,
  respondMatchSchema,
  searchRoommatesQuerySchema,
} from '@yasayis/shared';
import { ZodValidationPipe, zodBody } from '../../common/pipes/zod-validation.pipe';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser, OptionalAuth, RequireAbility } from '../auth/decorators';
import { JointSearchService } from './joint-search.service';
import { RoommatesService } from './roommates.service';

/**
 * Otaq yoldaşı kəşfi, uyğunlaşma və birgə axtarış  (PROMPT E1–E3)
 *
 * Kəşf qonağa da açıqdır (profillərə baxa bilir), amma uyğunluq faizi
 * yalnız giriş etmiş və profili tam olan tələbə üçün hesablanır.
 */
@Controller('roommates')
export class RoommatesController {
  constructor(
    private readonly roommates: RoommatesService,
    private readonly joint: JointSearchService,
  ) {}

  @OptionalAuth()
  @Get()
  discover(
    @Query(new ZodValidationPipe(searchRoommatesQuerySchema))
    query: Parameters<RoommatesService['discover']>[0],
    @CurrentUser() actor?: AuthUser,
  ) {
    return this.roommates.discover(query, actor?.id);
  }

  /** Uyğunluğun tam izahı — hansı amil neçə bal verdi. */
  @RequireAbility(Ability.MATCH_VIEW)
  @Get('match/:userId/breakdown')
  breakdown(@CurrentUser() actor: AuthUser, @Param('userId') userId: string) {
    return this.roommates.breakdown(actor.id, userId);
  }

  @RequireAbility(Ability.ROOMMATE_BROWSE)
  @Get('matches')
  matches(@CurrentUser() actor: AuthUser) {
    return this.roommates.listMatches(actor.id);
  }

  @RequireAbility(Ability.ROOMMATE_PROFILE_MANAGE)
  @Post('matches')
  request(
    @CurrentUser() actor: AuthUser,
    @Body(zodBody(requestMatchSchema)) dto: unknown,
  ) {
    return this.roommates.requestMatch(actor.id, (dto as { userId: string }).userId);
  }

  @RequireAbility(Ability.ROOMMATE_PROFILE_MANAGE)
  @Post('matches/:id/respond')
  respond(
    @CurrentUser() actor: AuthUser,
    @Param('id') id: string,
    @Body(zodBody(respondMatchSchema)) dto: unknown,
  ) {
    return this.roommates.respondToMatch(actor.id, id, (dto as { accept: boolean }).accept);
  }

  // --- Birlikdə ev axtar ---------------------------------------------------

  /** Birgə profil — yoxdursa iki tərəfin məlumatından avtomatik qurulur. */
  @RequireAbility(Ability.ROOMMATE_BROWSE)
  @Get('matches/:id/joint-search')
  jointSearch(@CurrentUser() actor: AuthUser, @Param('id') id: string) {
    return this.joint.getOrCreate(id, actor.id);
  }

  @RequireAbility(Ability.ROOMMATE_BROWSE)
  @Patch('matches/:id/joint-search')
  updateJointSearch(
    @CurrentUser() actor: AuthUser,
    @Param('id') id: string,
    @Body(zodBody(jointSearchSchema)) dto: unknown,
  ) {
    return this.joint.update(id, actor.id, dto as never);
  }

  /** Birgə profilə uyğun elanlar — D4 axtarış motoru ilə. */
  @RequireAbility(Ability.ROOMMATE_BROWSE)
  @Get('matches/:id/joint-search/listings')
  jointListings(
    @CurrentUser() actor: AuthUser,
    @Param('id') id: string,
    @Query(new ZodValidationPipe(pageQuerySchema)) query: { page: number; limit: number },
  ) {
    return this.joint.findListings(id, actor.id, query.page, query.limit);
  }
}
