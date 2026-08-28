import { BadRequestException, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { randomInt, createHash, timingSafeEqual } from 'node:crypto';
import { AUTH, RATE_LIMIT } from '@yasayis/shared';
import type { OtpPurpose } from '@yasayis/db';
import { PrismaService } from '../../common/prisma/prisma.service';
import { SmsService } from '../sms/sms.service';

/**
 * Birdəfəlik kod (OTP) axını.
 *
 * Kod bazada AÇIQ SAXLANMIR — yalnız SHA-256 hash-i. Yoxlama zamanı gələn kod
 * hash-lənib müqayisə olunur.
 *
 * Bu axının nəticəsi (`User.phoneVerifiedAt`) sonradan "Telefon təsdiqlənib"
 * nişanı və otaq yoldaşı profilinin görünürlüyü üçün istifadə olunur.
 */
@Injectable()
export class OtpService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sms: SmsService,
  ) {}

  private hash(code: string): string {
    return createHash('sha256').update(code).digest('hex');
  }

  /**
   * Hash müqayisəsi — SABİT VAXTLI.
   *
   * Adi `!==` ilk fərqli baytda dayanır və müqayisə müddəti düzgün rəqəmlərin
   * sayından asılı olur. Şəbəkə gecikməsi bunu böyük ölçüdə örtür, üstəlik
   * cəhd sayı 5-lə məhduddur — yəni praktik hücum çətindir. Buna baxmayaraq
   * sabit vaxtlı müqayisə heç nəyə başa gəlmir və kanalı tam bağlayır.
   */
  private hashesMatch(a: string, b: string): boolean {
    const left = Buffer.from(a, 'hex');
    const right = Buffer.from(b, 'hex');
    // Uzunluqlar fərqlidirsə `timingSafeEqual` xəta atır — əvvəlcədən yoxlanılır.
    return left.length === right.length && timingSafeEqual(left, right);
  }

  /**
   * Kod yaradır və SMS göndərir.
   * Eyni nömrəyə saatda 3 dəfədən çox göndərilmir.
   *
   * Yaradılan kodu QAYTARIR — yalnız `console` provayderi ilə dev mühitində
   * ekranda göstərmək üçün. Bu dəyərin cavaba düşüb-düşməyəcəyinə controller
   * qərar verir; servis onu heç vaxt özü açmır.
   */
  async issue(phone: string, purpose: OtpPurpose, userId?: string): Promise<string> {
    const since = new Date(Date.now() - RATE_LIMIT.OTP_REQUEST.ttlSec * 1000);
    const recent = await this.prisma.otpCode.count({
      where: { phone, purpose, createdAt: { gte: since } },
    });

    if (recent >= RATE_LIMIT.OTP_REQUEST.limit) {
      throw new HttpException(
        'Çox sayda kod tələb etdiniz. Bir saatdan sonra yenidən cəhd edin.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Köhnə istifadə olunmamış kodlar ləğv olunur — eyni anda yalnız bir kod işləyir.
    await this.prisma.otpCode.updateMany({
      where: { phone, purpose, usedAt: null },
      data: { usedAt: new Date() },
    });

    const code = String(randomInt(0, 10 ** AUTH.OTP_LENGTH)).padStart(AUTH.OTP_LENGTH, '0');

    await this.prisma.otpCode.create({
      data: {
        userId: userId ?? null,
        phone,
        codeHash: this.hash(code),
        purpose,
        expiresAt: new Date(Date.now() + AUTH.OTP_TTL_SEC * 1000),
      },
    });

    await this.sms.sendOtp(phone, code);
    return code;
  }

  /**
   * Kodu yoxlayır və istifadə olunmuş kimi işarələyir.
   * Uğursuz cəhdlər sayılır — 5 səhvdən sonra kod bloklanır.
   */
  async verify(phone: string, code: string, purpose: OtpPurpose): Promise<{ userId: string | null }> {
    const record = await this.prisma.otpCode.findFirst({
      where: { phone, purpose, usedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });

    if (!record) {
      throw new BadRequestException('Kodun müddəti bitib. Yeni kod tələb edin.');
    }

    if (record.attempts >= RATE_LIMIT.OTP_VERIFY.limit) {
      await this.prisma.otpCode.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      });
      throw new HttpException('Çox sayda səhv cəhd. Yeni kod tələb edin.', HttpStatus.TOO_MANY_REQUESTS);
    }

    if (!this.hashesMatch(record.codeHash, this.hash(code))) {
      await this.prisma.otpCode.update({
        where: { id: record.id },
        data: { attempts: { increment: 1 } },
      });
      throw new BadRequestException('Kod düzgün deyil');
    }

    await this.prisma.otpCode.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    });

    return { userId: record.userId };
  }
}
