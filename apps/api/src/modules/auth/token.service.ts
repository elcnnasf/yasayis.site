import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomUUID } from 'node:crypto';
import type { Response } from 'express';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { Env } from '../../config/env';
import {
  COOKIE,
  type AccessTokenPayload,
  type AuthUser,
  type RefreshTokenPayload,
} from './auth.types';

/**
 * Token idarəetməsi.
 *
 * Access token qısa ömürlüdür və bazaya yazılmır. Refresh token uzun ömürlüdür,
 * bazada YALNIZ hash-i saxlanılır və hər istifadədə rotasiya olunur — oğurlanmış
 * köhnə token təkrar işlədilə bilmir.
 */
@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService<Env, true>,
    private readonly prisma: PrismaService,
  ) {}

  private hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private get isProduction(): boolean {
    return this.config.get('NODE_ENV', { infer: true }) === 'production';
  }

  async issueAccessToken(user: AuthUser): Promise<{ token: string; expiresIn: number }> {
    const payload: AccessTokenPayload = {
      sub: user.id,
      st: user.isStudent,
      ow: user.isOwner,
      ad: user.isAdmin,
      pv: user.phoneVerified,
      ob: user.onboarded,
    };

    // jsonwebtoken "15m" kimi sətri də qəbul edir, amma tip səviyyəsində
    // şablon-literal tələb edir — saniyə ilə ötürmək həm sadə, həm dəqiqdir.
    const expiresIn = parseTtlSeconds(this.config.get('JWT_ACCESS_TTL', { infer: true }));
    const token = await this.jwt.signAsync(payload, {
      secret: this.config.get('JWT_ACCESS_SECRET', { infer: true }),
      expiresIn,
    });

    return { token, expiresIn };
  }

  async verifyAccessToken(token: string): Promise<AuthUser> {
    try {
      const p = await this.jwt.verifyAsync<AccessTokenPayload>(token, {
        secret: this.config.get('JWT_ACCESS_SECRET', { infer: true }),
      });
      return {
        id: p.sub,
        isStudent: p.st,
        isOwner: p.ow,
        isAdmin: p.ad,
        phoneVerified: p.pv,
        onboarded: p.ob,
      };
    } catch {
      throw new UnauthorizedException('Sessiyanızın müddəti bitib. Yenidən daxil olun.');
    }
  }

  async issueRefreshToken(
    userId: string,
    meta: { userAgent?: string; ip?: string } = {},
  ): Promise<string> {
    const jti = randomUUID();
    const ttlSeconds = parseTtlSeconds(this.config.get('JWT_REFRESH_TTL', { infer: true }));
    const payload: RefreshTokenPayload = { sub: userId, jti };

    const token = await this.jwt.signAsync(payload, {
      secret: this.config.get('JWT_REFRESH_SECRET', { infer: true }),
      expiresIn: ttlSeconds,
    });

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: this.hash(token),
        userAgent: meta.userAgent?.slice(0, 300) ?? null,
        ip: meta.ip?.slice(0, 64) ?? null,
        expiresAt: new Date(Date.now() + ttlSeconds * 1000),
      },
    });

    return token;
  }

  /**
   * Refresh token-i yoxlayır və dərhal ləğv edir (rotasiya).
   * Ləğv edilmiş və ya tapılmayan token → 401.
   */
  async consumeRefreshToken(token: string): Promise<string> {
    let payload: RefreshTokenPayload;
    try {
      payload = await this.jwt.verifyAsync<RefreshTokenPayload>(token, {
        secret: this.config.get('JWT_REFRESH_SECRET', { infer: true }),
      });
    } catch {
      throw new UnauthorizedException('Sessiya etibarsızdır. Yenidən daxil olun.');
    }

    const record = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: this.hash(token) },
    });

    if (!record || record.revokedAt || record.expiresAt < new Date()) {
      throw new UnauthorizedException('Sessiya etibarsızdır. Yenidən daxil olun.');
    }

    await this.prisma.refreshToken.update({
      where: { id: record.id },
      data: { revokedAt: new Date() },
    });

    return payload.sub;
  }

  async revokeToken(token: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: this.hash(token), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /** Parol dəyişəndə və ya hesab bloklananda bütün cihazlardan çıxarır. */
  async revokeAllForUser(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  setAuthCookies(res: Response, accessToken: string, refreshToken: string): void {
    const sameSite = this.config.get('COOKIE_SAMESITE', { infer: true });
    // `SameSite=None` yalnız `Secure` ilə etibarlıdır — dev-də HTTPS olmasa
    // belə brauzer cookie-ni atır, ona görə bu halda `secure` məcburidir.
    const secure = this.isProduction || sameSite === 'none';

    res.cookie(COOKIE.ACCESS, accessToken, {
      httpOnly: true,
      secure,
      sameSite,
      path: '/',
      maxAge: parseTtlSeconds(this.config.get('JWT_ACCESS_TTL', { infer: true })) * 1000,
    });
    res.cookie(COOKIE.REFRESH, refreshToken, {
      httpOnly: true,
      secure,
      sameSite,
      // Refresh cookie yalnız auth endpoint-lərinə göndərilir.
      path: '/api/v1/auth',
      maxAge: parseTtlSeconds(this.config.get('JWT_REFRESH_TTL', { infer: true })) * 1000,
    });
  }

  clearAuthCookies(res: Response): void {
    res.clearCookie(COOKIE.ACCESS, { path: '/' });
    res.clearCookie(COOKIE.REFRESH, { path: '/api/v1/auth' });
  }
}

/** "15m", "30d", "3600" → saniyə */
export function parseTtlSeconds(ttl: string): number {
  const m = /^(\d+)([smhd])?$/.exec(ttl.trim());
  if (!m) throw new Error(`TTL formatı yanlışdır: ${ttl}`);
  const n = Number(m[1]);
  switch (m[2]) {
    case 'd':
      return n * 86_400;
    case 'h':
      return n * 3_600;
    case 'm':
      return n * 60;
    default:
      return n;
  }
}
