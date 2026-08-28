import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { hash, verify } from '@node-rs/argon2';
import type {
  ChangePasswordInput,
  GoogleAuthInput,
  InitialRole,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
  SessionUserDto,
  UpdateOwnRolesInput,
  VerifyOtpInput,
} from '@yasayis/shared';
import type { OtpPurpose, User } from '@yasayis/db';
import { AuthRepository } from './auth.repository';
import { GoogleService } from './google.service';
import { OtpService } from './otp.service';
import type { AuthUser } from './auth.types';

/**
 * Autentifikasiya qaydaları  (PROMPT A3)
 *
 * Rollar ADDİTİVDİR: qeydiyyatda seçilən rol digərini bağlamır və sonradan
 * ikinci rol açılanda birincisi silinmir. Heç bir yerdə "rolu dəyiş" əməliyyatı
 * yoxdur — yalnız "bu rolu aç / bağla".
 */
/**
 * Mövcud olmayan istifadəçi üçün yoxlanılan yer tutucu hash.
 *
 * NİYƏ LAZIMDIR
 * Argon2 qəsdən yavaşdır (~50–100 ms). E-poçt tapılmayanda dərhal xəta atsaq,
 * cavab vaxtı kəskin fərqlənir və hücumçu YALNIZ TAYMERƏ baxaraq hansı
 * e-poçtların qeydiyyatda olduğunu müəyyən edir — xəta mesajları eyni olsa belə.
 * Ona görə istifadəçi tapılmayanda da bir dəfə həqiqi `verify` işlədilir.
 *
 * NİYƏ SABİT SƏTİR DEYİL
 * Əl ilə yazılmış hash argon2 tərəfindən oxuna bilməyəndə funksiya dərhal
 * xəta atır — yəni "yavaş" gözlədiyimiz yol yenə də sürətli olur və müdafiə
 * sözdə qalır. Ona görə dəyər açılışda REAL `hash()` çağırışı ilə yaradılır:
 * formatın etibarlı olduğuna zəmanət verilir.
 *
 * Təsadüfi mənbədən yaradılır və heç bir hesaba aid deyil.
 */
let dummyHashPromise: Promise<string> | null = null;

function dummyPasswordHash(): Promise<string> {
  dummyHashPromise ??= hash(randomBytes(32).toString('hex'));
  return dummyHashPromise;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly repo: AuthRepository,
    private readonly otp: OtpService,
    private readonly google: GoogleService,
  ) {}

  // --- Qeydiyyat və giriş --------------------------------------------------

  async register(input: RegisterInput): Promise<AuthUser> {
    const email = input.email.toLowerCase();

    if (await this.repo.findByEmail(email)) {
      throw new ConflictException('Bu e-poçt ünvanı artıq qeydiyyatdan keçib');
    }
    if (input.phone && (await this.repo.findByPhone(input.phone))) {
      throw new ConflictException('Bu telefon nömrəsi artıq qeydiyyatdan keçib');
    }

    const user = await this.repo.create({
      email,
      phone: input.phone ?? null,
      passwordHash: await hash(input.password),
      fullName: input.fullName.trim(),
      ...rolesFromInitial(input.role),
    });

    // Telefon verilibsə, dərhal təsdiq kodu göndərilir — istifadəçi
    // onboarding zamanı onu təsdiqləyəcək.
    if (input.phone) {
      await this.otp.issue(input.phone, 'PHONE_VERIFY', user.id);
    }

    return toAuthUser(user);
  }

  async login(input: LoginInput): Promise<AuthUser> {
    const user = await this.repo.findByEmail(input.email);

    // Eyni mesaj: hansı e-poçtun qeydiyyatda olduğunu üzə çıxarmırıq.
    const invalid = new UnauthorizedException('E-poçt və ya parol yanlışdır');

    // Hash mövcud olmasa da yoxlama İŞLƏDİLİR — cavab vaxtı hər iki halda
    // eyni qalsın deyə. Bax: `dummyPasswordHash`.
    const hashToCheck = user?.passwordHash ?? (await dummyPasswordHash());
    const passwordOk = await verify(hashToCheck, input.password).catch(() => false);

    if (!user?.passwordHash || !passwordOk) throw invalid;

    this.assertActive(user);
    await this.repo.touchLogin(user.id);
    return toAuthUser(user);
  }

  /**
   * Google ilə giriş.
   * Eyni e-poçtla parollu hesab varsa, Google hesabı ona BAĞLANIR —
   * dublikat istifadəçi yaradılmır.
   */
  async loginWithGoogle(input: GoogleAuthInput): Promise<AuthUser> {
    const profile = await this.google.exchangeCode(input.code, input.redirectUri);

    const existingByGoogle = await this.repo.findByGoogleId(profile.googleId);
    if (existingByGoogle) {
      this.assertActive(existingByGoogle);
      await this.repo.touchLogin(existingByGoogle.id);
      return toAuthUser(existingByGoogle);
    }

    const existingByEmail = await this.repo.findByEmail(profile.email);
    if (existingByEmail) {
      this.assertActive(existingByEmail);
      const linked = await this.repo.update(existingByEmail.id, {
        googleId: profile.googleId,
        avatarUrl: existingByEmail.avatarUrl ?? profile.avatarUrl,
        emailVerifiedAt: existingByEmail.emailVerifiedAt ?? new Date(),
        lastLoginAt: new Date(),
      });
      return toAuthUser(linked);
    }

    const created = await this.repo.create({
      email: profile.email,
      googleId: profile.googleId,
      fullName: profile.fullName,
      avatarUrl: profile.avatarUrl,
      emailVerifiedAt: profile.emailVerified ? new Date() : null,
      lastLoginAt: new Date(),
      ...rolesFromInitial(input.role),
    });

    return toAuthUser(created);
  }

  // --- Telefon təsdiqi -----------------------------------------------------

  async requestPhoneOtp(
    phone: string,
    purpose: OtpPurpose = 'PHONE_VERIFY',
    userId?: string,
  ): Promise<string> {
    return this.otp.issue(phone, purpose, userId);
  }

  /**
   * Telefonu təsdiqləyir.
   * Nömrə başqa hesaba bağlıdırsa, əməliyyat rədd edilir — bir nömrə bir hesab.
   */
  async verifyPhone(userId: string, input: VerifyOtpInput): Promise<AuthUser> {
    const owner = await this.repo.findByPhone(input.phone);
    if (owner && owner.id !== userId) {
      throw new ConflictException('Bu nömrə başqa hesaba bağlıdır');
    }

    await this.otp.verify(input.phone, input.code, 'PHONE_VERIFY');
    const user = await this.repo.markPhoneVerified(userId, input.phone);
    return toAuthUser(user);
  }

  /** Telefon + OTP ilə parolsuz giriş. */
  async loginWithPhone(input: VerifyOtpInput): Promise<AuthUser> {
    const user = await this.repo.findByPhone(input.phone);
    if (!user) {
      throw new UnauthorizedException('Bu nömrə ilə hesab tapılmadı');
    }

    await this.otp.verify(input.phone, input.code, 'LOGIN');
    this.assertActive(user);

    const updated = user.phoneVerifiedAt
      ? await this.repo.touchLogin(user.id)
      : await this.repo.markPhoneVerified(user.id, input.phone);

    return toAuthUser(updated);
  }

  // --- Parol ---------------------------------------------------------------

  async changePassword(userId: string, input: ChangePasswordInput): Promise<void> {
    const user = await this.repo.findById(userId);
    if (!user) throw new UnauthorizedException('Hesab tapılmadı');

    if (!user.passwordHash) {
      throw new BadRequestException(
        'Hesabınız Google ilə açılıb. Əvvəlcə parol təyin edin.',
      );
    }
    if (!(await verify(user.passwordHash, input.currentPassword))) {
      throw new BadRequestException('Cari parol yanlışdır');
    }

    await this.repo.update(userId, { passwordHash: await hash(input.newPassword) });
  }

  async resetPassword(input: ResetPasswordInput): Promise<string> {
    const user = await this.repo.findByPhone(input.phone);
    if (!user) throw new BadRequestException('Bu nömrə ilə hesab tapılmadı');

    await this.otp.verify(input.phone, input.code, 'PASSWORD_RESET');
    await this.repo.update(user.id, { passwordHash: await hash(input.newPassword) });
    return user.id;
  }

  // --- Rollar (additiv) ----------------------------------------------------

  /**
   * İstifadəçi öz rollarını açıb-bağlaya bilər.
   * `isAdmin` buradan idarə olunmur — admin rolunu yalnız başqa admin verə bilər.
   */
  async updateOwnRoles(userId: string, input: UpdateOwnRolesInput): Promise<AuthUser> {
    const user = await this.repo.findById(userId);
    if (!user) throw new UnauthorizedException('Hesab tapılmadı');

    const isStudent = input.isStudent ?? user.isStudent;
    const isOwner = input.isOwner ?? user.isOwner;

    if (!isStudent && !isOwner && !user.isAdmin) {
      throw new BadRequestException('Ən azı bir rol aktiv qalmalıdır');
    }

    const updated = await this.repo.update(userId, { isStudent, isOwner });
    return toAuthUser(updated);
  }

  // --- Sessiya -------------------------------------------------------------

  async getSessionUser(userId: string): Promise<SessionUserDto> {
    const user = await this.repo.findById(userId);
    if (!user) throw new UnauthorizedException('Hesab tapılmadı');
    this.assertActive(user);
    return toSessionUser(user);
  }

  async markOnboarded(userId: string): Promise<AuthUser> {
    const user = await this.repo.update(userId, { onboardedAt: new Date() });
    return toAuthUser(user);
  }

  private assertActive(user: User): void {
    if (user.status === 'SUSPENDED') {
      throw new ForbiddenException('Hesabınız dayandırılıb. Dəstəklə əlaqə saxlayın.');
    }
    if (user.status === 'DELETED' || user.deletedAt) {
      throw new UnauthorizedException('Hesab tapılmadı');
    }
  }
}

/** Qeydiyyatdakı seçim → additiv bayraqlar. "BOTH" hər ikisini açır. */
function rolesFromInitial(role: InitialRole): { isStudent: boolean; isOwner: boolean } {
  return {
    isStudent: role === 'STUDENT' || role === 'BOTH',
    isOwner: role === 'OWNER' || role === 'BOTH',
  };
}

export function toAuthUser(user: User): AuthUser {
  return {
    id: user.id,
    isStudent: user.isStudent,
    isOwner: user.isOwner,
    isAdmin: user.isAdmin,
    phoneVerified: user.phoneVerifiedAt !== null,
    onboarded: user.onboardedAt !== null,
  };
}

export function toSessionUser(user: User): SessionUserDto {
  return {
    id: user.id,
    email: user.email,
    phone: user.phone,
    fullName: user.fullName,
    avatarUrl: user.avatarUrl,
    isStudent: user.isStudent,
    isOwner: user.isOwner,
    isAdmin: user.isAdmin,
    phoneVerified: user.phoneVerifiedAt !== null,
    emailVerified: user.emailVerifiedAt !== null,
    onboarded: user.onboardedAt !== null,
  };
}
