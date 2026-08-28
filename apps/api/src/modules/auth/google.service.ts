import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../../config/env';

export interface GoogleProfile {
  googleId: string;
  email: string;
  emailVerified: boolean;
  fullName: string;
  avatarUrl: string | null;
}

/**
 * Google OAuth 2.0 — authorization code axını.
 *
 * Client Google-a yönləndirilir, geri qayıdanda `code` alır və bu API-yə göndərir.
 * Token mübadiləsi yalnız serverdə baş verir, client secret brauzerə düşmür.
 */
@Injectable()
export class GoogleService {
  private readonly logger = new Logger(GoogleService.name);

  constructor(private readonly config: ConfigService<Env, true>) {}

  get isConfigured(): boolean {
    return Boolean(
      this.config.get('GOOGLE_CLIENT_ID', { infer: true }) &&
        this.config.get('GOOGLE_CLIENT_SECRET', { infer: true }),
    );
  }

  /** Client-in istifadə edəcəyi yönləndirmə ünvanı. */
  buildAuthUrl(state: string, redirectUri?: string): string {
    const params = new URLSearchParams({
      client_id: this.config.get('GOOGLE_CLIENT_ID', { infer: true }) ?? '',
      redirect_uri: redirectUri ?? this.defaultRedirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'offline',
      prompt: 'select_account',
      state,
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  async exchangeCode(code: string, redirectUri?: string): Promise<GoogleProfile> {
    if (!this.isConfigured) {
      throw new BadRequestException('Google ilə giriş hazırda aktiv deyil');
    }

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: this.config.get('GOOGLE_CLIENT_ID', { infer: true }) ?? '',
        client_secret: this.config.get('GOOGLE_CLIENT_SECRET', { infer: true }) ?? '',
        redirect_uri: redirectUri ?? this.defaultRedirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      this.logger.error(`Google token mübadiləsi uğursuz: ${tokenResponse.status}`);
      throw new BadRequestException('Google ilə giriş alınmadı. Yenidən cəhd edin.');
    }

    const { access_token } = (await tokenResponse.json()) as { access_token?: string };
    if (!access_token) throw new BadRequestException('Google cavabı natamamdır');

    const userResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    if (!userResponse.ok) {
      throw new BadRequestException('Google profil məlumatı alınmadı');
    }

    const p = (await userResponse.json()) as {
      sub: string;
      email?: string;
      email_verified?: boolean;
      name?: string;
      picture?: string;
    };

    if (!p.email) {
      throw new BadRequestException('Google hesabınızda e-poçt ünvanı tapılmadı');
    }

    return {
      googleId: p.sub,
      email: p.email.toLowerCase(),
      emailVerified: p.email_verified ?? false,
      fullName: p.name?.trim() || p.email.split('@')[0] || 'İstifadəçi',
      avatarUrl: p.picture ?? null,
    };
  }

  private get defaultRedirectUri(): string {
    return (
      this.config.get('GOOGLE_REDIRECT_URI', { infer: true }) ??
      'http://localhost:3000/giris/google'
    );
  }
}
