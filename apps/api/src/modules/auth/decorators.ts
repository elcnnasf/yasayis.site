import { createParamDecorator, SetMetadata, type ExecutionContext } from '@nestjs/common';
import type { Ability } from '@yasayis/shared';
import type { Request } from 'express';
import type { AuthUser } from './auth.types';

export const IS_PUBLIC = 'auth:public';
export const OPTIONAL_AUTH = 'auth:optional';
export const REQUIRED_ABILITIES = 'auth:abilities';
export const REQUIRE_PHONE_VERIFIED = 'auth:phone-verified';

/** Giriş tələb etmir. */
export const Public = () => SetMetadata(IS_PUBLIC, true);

/**
 * Giriş məcburi deyil, amma token varsa istifadəçi tanınır.
 * Elan siyahısında "favoritdədir" nişanı kimi hallar üçün.
 */
export const OptionalAuth = () => SetMetadata(OPTIONAL_AUTH, true);

/**
 * Sadalanan icazələrin HAMISI tələb olunur.
 * Rollar additiv olduğu üçün yoxlama `can()` ilə aparılır, rol adı ilə deyil.
 */
export const RequireAbility = (...abilities: Ability[]) =>
  SetMetadata(REQUIRED_ABILITIES, abilities);

/** Telefon təsdiqi tələb edən əməliyyatlar üçün. */
export const RequirePhoneVerified = () => SetMetadata(REQUIRE_PHONE_VERIFIED, true);

/** `@CurrentUser() user: AuthUser` — guard-dan sonra həmişə doludur. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser | undefined => {
    const request = ctx.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    return request.user;
  },
);
