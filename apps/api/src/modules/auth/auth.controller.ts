import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
  Res,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import {
  changePasswordSchema,
  googleAuthSchema,
  loginSchema,
  RATE_LIMIT,
  registerSchema,
  requestOtpSchema,
  resetPasswordSchema,
  setPhoneSchema,
  updateOwnRolesSchema,
  verifyOtpSchema,
  type AuthResultDto,
  type RequestOtpInput,
  type SessionUserDto,
} from '@yasayis/shared';
import { randomUUID } from 'node:crypto';
import type { Request, Response } from 'express';
import type { Env } from '../../config/env';
import { zodBody } from '../../common/pipes/zod-validation.pipe';
import { AuthService } from './auth.service';
import { COOKIE, type AuthUser } from './auth.types';
import { CurrentUser, Public } from './decorators';
import { GoogleService } from './google.service';
import { TokenService } from './token.service';

/**
 * Autentifikasiya endpoint-ləri  (PROMPT A3)
 *
 * Token-lər httpOnly cookie ilə göndərilir (XSS-ə qarşı), access token həm də
 * cavab gövdəsində qaytarılır ki, mobil/başqa client Authorization başlığı ilə
 * işləyə bilsin. Refresh token yalnız cookie-də qalır.
 *
 * Qeydiyyatdan sonra cavabdakı `user.onboarded === false` olur — client bunu
 * görüb istifadəçini onboarding axınına yönləndirir (Prompt C1).
 */
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly tokens: TokenService,
    private readonly google: GoogleService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  @Public()
  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async register(
    @Body(zodBody(registerSchema)) dto: unknown,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResultDto> {
    const user = await this.auth.register(dto as never);
    return this.startSession(user, req, res);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: RATE_LIMIT.LOGIN.limit, ttl: RATE_LIMIT.LOGIN.ttlSec * 1000 } })
  async login(
    @Body(zodBody(loginSchema)) dto: unknown,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResultDto> {
    const user = await this.auth.login(dto as never);
    return this.startSession(user, req, res);
  }

  /**
   * Client-in hansı giriş yollarını göstərəcəyi.
   *
   * Konfiqurasiya serverdədir, web isə onu oxuya bilmir — ona görə açıq şəkildə
   * soruşur. İşləməyən düyməni ekranda saxlamaqdansa (istifadəçi basır, xəta
   * alır) onu ümumiyyətlə göstərməmək düzgündür.
   */
  @Public()
  @Get('capabilities')
  capabilities() {
    return {
      /** Telefonla giriş, nömrə təsdiqi və parol sıfırlama. */
      phoneAuth: this.config.get('SMS_PROVIDER', { infer: true }) !== 'disabled',
      google: this.google.isConfigured,
    };
  }

  // --- Google OAuth --------------------------------------------------------

  /**
   * Client bu ünvana yönləndirir; `state` CSRF-ə qarşıdır.
   *
   * `configured` sahəsi client-in düyməni gizlətməsi üçündür: açar dəyərləri
   * boş olanda `client_id=` ilə URL qurulurdu və istifadəçi Google-un
   * "invalid_client" xəta səhifəsinə düşürdü. İndi ekranda işləməyən düymə
   * ümumiyyətlə görünmür.
   */
  @Public()
  @Get('google/url')
  googleUrl(@Query('redirectUri') redirectUri?: string) {
    if (!this.google.isConfigured) {
      return { configured: false, url: null, state: null };
    }
    const state = randomUUID();
    return { configured: true, url: this.google.buildAuthUrl(state, redirectUri), state };
  }

  @Public()
  @Post('google')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async googleLogin(
    @Body(zodBody(googleAuthSchema)) dto: unknown,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResultDto> {
    const user = await this.auth.loginWithGoogle(dto as never);
    return this.startSession(user, req, res);
  }

  // --- Telefon və OTP ------------------------------------------------------

  @Public()
  @Post('otp/request')
  @HttpCode(HttpStatus.ACCEPTED)
  @Throttle({
    default: { limit: RATE_LIMIT.OTP_REQUEST.limit, ttl: RATE_LIMIT.OTP_REQUEST.ttlSec * 1000 },
  })
  async requestOtp(@Body(zodBody(requestOtpSchema)) dto: unknown) {
    this.assertPhoneAuth();
    const { phone, purpose } = dto as RequestOtpInput;
    // `purpose` OTP qeydinin bir hissəsidir və yoxlama zamanı da tələb olunur.
    // Əvvəl burada atılırdı: hansı məqsəd göndərilsə də həmişə `PHONE_VERIFY`
    // kodu yaradılırdı, ona görə telefonla giriş və parol sıfırlama heç vaxt
    // uyğun kod tapa bilmirdi — hər ikisi "Kodun müddəti bitib" qaytarırdı.
    const code = await this.auth.requestPhoneOtp(phone, purpose);

    /*
      DEV KÖMƏYİ — kod cavabda YALNIZ iki şərt birlikdə ödənəndə gedir:
        1. `SMS_PROVIDER === 'console'` — yəni real SMS ümumiyyətlə göndərilmir
        2. `NODE_ENV !== 'production'`

      Səbəb: `console` provayderi ilə kod yalnız server log-una yazılır və
      brauzerdə işləyən adam onu heç cür görə bilmir — telefon təsdiqi, parolsuz
      giriş və parol sıfırlama dev mühitində yoxlanıla bilmir.

      Sızma riski yoxdur: `validateEnv` production-da `SMS_PROVIDER="console"`
      ilə tətbiqin ümumiyyətlə start etməsinə icazə vermir, üstəlik burada
      `NODE_ENV` ayrıca yoxlanılır. İki müstəqil şərtdən biri də düşsə, sahə
      cavaba düşmür.
    */
    const devCode =
      this.config.get('SMS_PROVIDER', { infer: true }) === 'console' &&
      this.config.get('NODE_ENV', { infer: true }) !== 'production'
        ? code
        : undefined;

    // Nömrənin qeydiyyatda olub-olmadığını üzə çıxarmırıq.
    return { message: 'Kod göndərildi', ...(devCode ? { devCode } : {}) };
  }

  /** Giriş etmiş istifadəçi öz nömrəsini təsdiqləyir. */
  @Post('phone/verify')
  @HttpCode(HttpStatus.OK)
  async verifyPhone(
    @CurrentUser() actor: AuthUser,
    @Body(zodBody(verifyOtpSchema)) dto: unknown,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResultDto> {
    this.assertPhoneAuth();
    const user = await this.auth.verifyPhone(actor.id, dto as never);
    // Token yenilənir ki, `phoneVerified` bayrağı dərhal işləsin.
    return this.startSession(user, req, res);
  }

  /**
   * Nömrəni təsdiqsiz təyin etmək / silmək.
   *
   * `assertPhoneAuth()` BURADA ÇAĞIRILMIR: bu axının SMS-ə heç bir aidiyyatı
   * yoxdur və məhz provayder olmayanda lazımdır.
   */
  @Post('phone/set')
  @HttpCode(HttpStatus.OK)
  async setPhone(
    @CurrentUser() actor: AuthUser,
    @Body(zodBody(setPhoneSchema)) dto: unknown,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResultDto> {
    const user = await this.auth.setPhone(actor.id, dto as never);
    return this.startSession(user, req, res);
  }

  @Post('phone/clear')
  @HttpCode(HttpStatus.OK)
  async clearPhone(
    @CurrentUser() actor: AuthUser,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResultDto> {
    const user = await this.auth.clearPhone(actor.id);
    return this.startSession(user, req, res);
  }

  /** Parolsuz giriş: telefon + OTP. */
  @Public()
  @Post('phone/login')
  @HttpCode(HttpStatus.OK)
  async phoneLogin(
    @Body(zodBody(verifyOtpSchema)) dto: unknown,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResultDto> {
    this.assertPhoneAuth();
    const user = await this.auth.loginWithPhone(dto as never);
    return this.startSession(user, req, res);
  }

  // --- Parol ---------------------------------------------------------------

  @Post('password/change')
  @HttpCode(HttpStatus.NO_CONTENT)
  async changePassword(
    @CurrentUser() actor: AuthUser,
    @Body(zodBody(changePasswordSchema)) dto: unknown,
  ): Promise<void> {
    await this.auth.changePassword(actor.id, dto as never);
    // Parol dəyişəndə bütün digər cihazlardan çıxarılır.
    await this.tokens.revokeAllForUser(actor.id);
  }

  @Public()
  @Post('password/reset')
  @HttpCode(HttpStatus.NO_CONTENT)
  async resetPassword(@Body(zodBody(resetPasswordSchema)) dto: unknown): Promise<void> {
    // Parol sıfırlama SMS koduna əsaslanır — telefon sönülüdürsə mümkün deyil.
    this.assertPhoneAuth();
    const userId = await this.auth.resetPassword(dto as never);
    await this.tokens.revokeAllForUser(userId);
  }

  // --- Sessiya -------------------------------------------------------------

  @Get('me')
  me(@CurrentUser() actor: AuthUser): Promise<SessionUserDto> {
    return this.auth.getSessionUser(actor.id);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResultDto> {
    const cookies = req.cookies as Record<string, string> | undefined;
    const token = cookies?.[COOKIE.REFRESH];
    if (!token) {
      this.tokens.clearAuthCookies(res);
      throw new UnauthorizedException('Sessiya tapılmadı. Yenidən daxil olun.');
    }

    const userId = await this.tokens.consumeRefreshToken(token);
    const session = await this.auth.getSessionUser(userId);
    return this.startSession(sessionToAuthUser(session), req, res);
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    const cookies = req.cookies as Record<string, string> | undefined;
    const token = cookies?.[COOKIE.REFRESH];
    if (token) await this.tokens.revokeToken(token);
    this.tokens.clearAuthCookies(res);
  }

  // --- Rollar (additiv) ----------------------------------------------------

  @Post('roles')
  @HttpCode(HttpStatus.OK)
  async updateRoles(
    @CurrentUser() actor: AuthUser,
    @Body(zodBody(updateOwnRolesSchema)) dto: unknown,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResultDto> {
    const user = await this.auth.updateOwnRoles(actor.id, dto as never);
    return this.startSession(user, req, res);
  }

  /** Onboarding tamamlandı (Prompt C1-in sonu). */
  @Post('onboarding/complete')
  @HttpCode(HttpStatus.OK)
  async completeOnboarding(
    @CurrentUser() actor: AuthUser,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResultDto> {
    const user = await this.auth.markOnboarded(actor.id);
    return this.startSession(user, req, res);
  }

  // --- Köməkçi -------------------------------------------------------------

  /**
   * Telefon funksiyaları söndürülübsə sorğunu dayandırır.
   *
   * `503` seçilib, `400` yox: səhv istifadəçidə deyil — xidmət konfiqurasiya
   * olunmayıb. Mesaj da bunu açıq deyir ki, istifadəçi öz nömrəsində problem
   * axtarmasın.
   */
  private assertPhoneAuth(): void {
    if (this.config.get('SMS_PROVIDER', { infer: true }) === 'disabled') {
      throw new ServiceUnavailableException(
        'Telefonla bağlı funksiyalar hazırda əlçatan deyil. E-poçt ilə davam edin.',
      );
    }
  }

  private async startSession(
    user: AuthUser,
    req: Request,
    res: Response,
  ): Promise<AuthResultDto> {
    const [{ token: accessToken, expiresIn }, refreshToken] = await Promise.all([
      this.tokens.issueAccessToken(user),
      this.tokens.issueRefreshToken(user.id, {
        userAgent: req.headers['user-agent'],
        ip: req.ip,
      }),
    ]);

    this.tokens.setAuthCookies(res, accessToken, refreshToken);

    return {
      user: await this.auth.getSessionUser(user.id),
      accessToken,
      expiresIn,
    };
  }
}

function sessionToAuthUser(session: SessionUserDto): AuthUser {
  return {
    id: session.id,
    isStudent: session.isStudent,
    isOwner: session.isOwner,
    isAdmin: session.isAdmin,
    phoneVerified: session.phoneVerified,
    onboarded: session.onboarded,
  };
}
