import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Ability, sendMessageSchema } from '@yasayis/shared';
import { zodBody } from '../../common/pipes/zod-validation.pipe';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser, RequireAbility } from '../auth/decorators';
import { MessagesService } from './messages.service';

/**
 * Daxili mesajlar.
 *
 * Sürət limiti göndərməyə qoyulub: mesaj yeganə yerdir ki, istifadəçi başqa
 * istifadəçiyə birbaşa mətn çatdıra bilir, ona görə spam üçün ən açıq kanaldır.
 */
@RequireAbility(Ability.MESSAGE_SEND)
@Controller('me/messages')
export class MessagesController {
  constructor(private readonly messages: MessagesService) {}

  /** Söhbətlərin siyahısı — hər cütlük + elan üçün bir sətir. */
  @Get()
  threads(@CurrentUser() actor: AuthUser) {
    return this.messages.threads(actor.id);
  }

  /** Naviqasiyadakı sayğac üçün — yüngül sorğu. */
  @Get('unread-count')
  async unreadCount(@CurrentUser() actor: AuthUser) {
    return { count: await this.messages.unreadCount(actor.id) };
  }

  @Post()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  send(@CurrentUser() actor: AuthUser, @Body(zodBody(sendMessageSchema)) dto: unknown) {
    return this.messages.send(actor.id, dto as never);
  }

  /**
   * Bir söhbət. `listingId` verilməyəndə elana bağlı OLMAYAN yazışma açılır —
   * `null` ilə `undefined` burada fərqli mənalıdır, ona görə açıq ötürülür.
   */
  @Get(':partnerId')
  thread(
    @CurrentUser() actor: AuthUser,
    @Param('partnerId') partnerId: string,
    @Query('listingId') listingId?: string,
  ) {
    return this.messages.thread(actor.id, partnerId, listingId || undefined);
  }

  @Post(':partnerId/read')
  @HttpCode(HttpStatus.NO_CONTENT)
  markRead(
    @CurrentUser() actor: AuthUser,
    @Param('partnerId') partnerId: string,
    @Query('listingId') listingId?: string,
  ) {
    return this.messages.markRead(actor.id, partnerId, listingId || undefined);
  }
}
