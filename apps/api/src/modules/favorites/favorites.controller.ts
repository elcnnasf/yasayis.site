import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { Ability, FavoriteTarget, favoriteSchema } from '@yasayis/shared';
import { zodBody } from '../../common/pipes/zod-validation.pipe';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser, RequireAbility } from '../auth/decorators';
import { FavoritesService } from './favorites.service';

/** Saxlanılanlar — elan və otaq yoldaşı profili eyni mexanizmdə. */
@RequireAbility(Ability.FAVORITE_MANAGE)
@Controller('favorites')
export class FavoritesController {
  constructor(private readonly favorites: FavoritesService) {}

  @Get()
  list(@CurrentUser() actor: AuthUser) {
    return this.favorites.list(actor.id);
  }

  /** Kartlardakı ürək düyməsinin vəziyyəti — yalnız id-lər, sürətli sorğu. */
  @Get('ids')
  ids(@CurrentUser() actor: AuthUser) {
    return this.favorites.listIds(actor.id);
  }

  @Post()
  add(@CurrentUser() actor: AuthUser, @Body(zodBody(favoriteSchema)) dto: unknown) {
    return this.favorites.add(actor.id, dto as never);
  }

  @Delete(':targetType/:targetId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentUser() actor: AuthUser,
    @Param('targetType') targetType: FavoriteTarget,
    @Param('targetId') targetId: string,
  ) {
    return this.favorites.remove(actor.id, targetType, targetId);
  }
}
