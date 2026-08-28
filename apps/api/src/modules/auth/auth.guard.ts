import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { can, type Ability } from '@yasayis/shared';
import type { Request } from 'express';
import { COOKIE, type AuthUser } from './auth.types';
import {
  IS_PUBLIC,
  OPTIONAL_AUTH,
  REQUIRED_ABILITIES,
  REQUIRE_PHONE_VERIFIED,
} from './decorators';
import { TokenService } from './token.service';

/**
 * Qlobal auth guard.
 *
 * Ardıcıllıq:
 *   1. `@Public()` → heç nə yoxlanmır.
 *   2. Token oxunur (cookie, sonra Authorization başlığı).
 *   3. `@OptionalAuth()` → token yoxdursa keçir, varsa istifadəçi bağlanır.
 *   4. `@RequireAbility(...)` → additiv rolların birləşməsi ilə yoxlanılır.
 *   5. `@RequirePhoneVerified()` → telefon təsdiqi tələb olunur.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokens: TokenService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()];
    const request = context.switchToHttp().getRequest<Request & { user?: AuthUser }>();

    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, targets)) return true;

    const optional = this.reflector.getAllAndOverride<boolean>(OPTIONAL_AUTH, targets);
    const token = extractToken(request);

    if (!token) {
      if (optional) return true;
      throw new UnauthorizedException('Bu əməliyyat üçün giriş etməlisiniz');
    }

    let user: AuthUser;
    try {
      user = await this.tokens.verifyAccessToken(token);
    } catch (error) {
      if (optional) return true;
      throw error;
    }
    request.user = user;

    const abilities =
      this.reflector.getAllAndOverride<Ability[]>(REQUIRED_ABILITIES, targets) ?? [];
    const missing = abilities.find((ability) => !can(user, ability));
    if (missing) {
      throw new ForbiddenException('Bu əməliyyata icazəniz yoxdur');
    }

    if (
      this.reflector.getAllAndOverride<boolean>(REQUIRE_PHONE_VERIFIED, targets) &&
      !user.phoneVerified
    ) {
      throw new ForbiddenException('Bu əməliyyat üçün telefon nömrənizi təsdiqləyin');
    }

    return true;
  }
}

function extractToken(request: Request): string | null {
  const cookies = request.cookies as Record<string, string> | undefined;
  const fromCookie = cookies?.[COOKIE.ACCESS];
  if (fromCookie) return fromCookie;

  const header = request.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7).trim() || null;

  return null;
}
