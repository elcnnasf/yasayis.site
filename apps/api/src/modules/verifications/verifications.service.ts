import { ForbiddenException, Injectable } from '@nestjs/common';
import { VerificationStatus, VerificationType } from '@yasayis/db';
import type { RoommateProfileInput } from '@yasayis/shared';
import { PrismaService } from '../../common/prisma/prisma.service';

/**
 * Doğrulama və otaq yoldaşı profilinin görünürlüyü.
 *
 * YALNIZ TELEFON TƏSDİQİ VAR.
 *
 * Tələbə və ev sahibi təsdiqi çıxarılıb. Hər ikisi admin tərəfindən əl ilə
 * verilirdi və uzaqdan etibarlı yoxlanıla bilmirdi: göndərilən tələbə bileti
 * və ya mülkiyyət sənədi şəkli onu göndərənə aid olduğunu sübut etmir. Səhv
 * verilə bilən nişan istifadəçidə yanlış etibar yaradır — nişanın olmaması
 * yanlış nişandan yaxşıdır.
 *
 * Telefon təsdiqi qalır, çünki o, OTP ilə AVTOMATİKDİR: kod yalnız nömrənin
 * sahibinə çatır, yəni nəticə həqiqətən yoxlanılmış olur.
 *
 * `Verification` cədvəli və `VerificationType` enum-u sxemdə saxlanılır —
 * köhnə sətirlər üçün və miqrasiya tələb etməmək üçün.
 *
 * Ən vacib qayda: otaq yoldaşı profili telefon təsdiqlənməyənə qədər
 * başqalarına GÖRÜNMÜR. Bu qayda burada məcburidir — client-in göndərdiyi
 * `visible: true` tək başına kifayət etmir.
 */
@Injectable()
export class VerificationsService {
  constructor(private readonly prisma: PrismaService) {}

  // =========================================================================
  //  Otaq yoldaşı profilinin görünürlüyü
  // =========================================================================

  async getRoommateProfile(userId: string) {
    const existing = await this.prisma.roommateProfile.findUnique({ where: { userId } });
    if (existing) return existing;
    return this.prisma.roommateProfile.create({ data: { userId } });
  }

  /**
   * Profili aktiv/görünən etmək.
   * `visible: true` yalnız telefon təsdiqlənibsə qəbul olunur.
   */
  async updateRoommateProfile(userId: string, input: RoommateProfileInput) {
    await this.getRoommateProfile(userId);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { phoneVerifiedAt: true },
    });

    if (input.visible && !user?.phoneVerifiedAt) {
      throw new ForbiddenException(
        'Profilinizin görünməsi üçün əvvəlcə telefon nömrənizi təsdiqləyin',
      );
    }

    return this.prisma.roommateProfile.update({
      where: { userId },
      data: { active: input.active, visible: input.visible },
    });
  }

  /**
   * Telefon təsdiqləndikdən sonra çağırılır.
   * Aktiv otaq yoldaşı profili varsa, avtomatik görünən olur — istifadəçi
   * təsdiqdən sonra ayrıca düymə axtarmasın.
   */
  async onPhoneVerified(userId: string): Promise<void> {
    await this.prisma.roommateProfile.updateMany({
      where: { userId, active: true },
      data: { visible: true },
    });
  }

  /** Telefon təsdiqi ləğv olunanda (nömrə dəyişəndə) profil gizlədilir. */
  async onPhoneUnverified(userId: string): Promise<void> {
    await this.prisma.roommateProfile.updateMany({
      where: { userId },
      data: { visible: false },
    });
  }

  // =========================================================================
  //  Təsdiq qeydləri (oxuma)
  // =========================================================================

  /**
   * Nişanların vəziyyəti.
   *
   * `student` və `owner` sahələri cavabda QALIR, amma praktikada həmişə `NONE`
   * olur: onları `VERIFIED` edən axın yoxdur. Sahələri silmək `ProfileOverview`
   * DTO-sunu və onu oxuyan bütün ekranları dəyişməyi tələb edərdi; dəyər isə
   * onsuz da heç yerdə göstərilmir.
   */
  async listForUser(userId: string) {
    const rows = await this.prisma.verification.findMany({
      where: { userId },
      select: { id: true, type: true, status: true, note: true, reviewedAt: true },
    });

    const statusOf = (type: VerificationType) =>
      rows.find((r) => r.type === type)?.status ?? VerificationStatus.NONE;

    return {
      phone: statusOf(VerificationType.PHONE),
      student: statusOf(VerificationType.STUDENT),
      owner: statusOf(VerificationType.OWNER),
      items: rows,
    };
  }
}
