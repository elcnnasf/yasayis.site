import type { ActorRoles } from '@yasayis/shared';

/**
 * Sorğuya bağlanan istifadəçi.
 *
 * Rollar bool bayraqlardır və additivdir — `isStudent` və `isOwner` eyni anda
 * true ola bilər. Guard-lar heç vaxt "rolu nədir" deyə soruşmur, `can()` çağırır.
 */
export interface AuthUser extends ActorRoles {
  id: string;
  phoneVerified: boolean;
  onboarded: boolean;
}

/** Access token-in içindəki məlumat. */
export interface AccessTokenPayload {
  sub: string;
  st: boolean;
  ow: boolean;
  ad: boolean;
  pv: boolean;
  ob: boolean;
}

export interface RefreshTokenPayload {
  sub: string;
  jti: string;
}

export const COOKIE = {
  ACCESS: 'yasayis_at',
  REFRESH: 'yasayis_rt',
} as const;
