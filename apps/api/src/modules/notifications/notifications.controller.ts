import { Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators';
import { NotificationsService } from './notifications.service';

/** İstifadəçinin bildirişləri — in-app kanalı. */
@Controller('me/notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  list(@CurrentUser() actor: AuthUser, @Query('unread') unread?: string) {
    return this.notifications.list(actor.id, unread === 'true');
  }

  /** Naviqasiyadakı sayğac üçün — yüngül sorğu. */
  @Get('unread-count')
  async unreadCount(@CurrentUser() actor: AuthUser) {
    return { count: await this.notifications.unreadCount(actor.id) };
  }

  @Post(':id/read')
  @HttpCode(HttpStatus.NO_CONTENT)
  markRead(@CurrentUser() actor: AuthUser, @Param('id') id: string) {
    return this.notifications.markRead(actor.id, id);
  }

  @Post('read-all')
  @HttpCode(HttpStatus.OK)
  markAllRead(@CurrentUser() actor: AuthUser) {
    return this.notifications.markAllRead(actor.id);
  }
}
