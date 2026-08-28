import { Injectable } from '@nestjs/common';
import type { Prisma, User } from '@yasayis/db';
import { PrismaService } from '../../common/prisma/prisma.service';

/** Yalnız baza sorğuları — heç bir qayda, heç bir hash-ləmə. */
@Injectable()
export class AuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findFirst({
      where: { email: email.toLowerCase(), deletedAt: null },
    });
  }

  findByPhone(phone: string): Promise<User | null> {
    return this.prisma.user.findFirst({ where: { phone, deletedAt: null } });
  }

  findByGoogleId(googleId: string): Promise<User | null> {
    return this.prisma.user.findFirst({ where: { googleId, deletedAt: null } });
  }

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findFirst({ where: { id, deletedAt: null } });
  }

  create(data: Prisma.UserCreateInput): Promise<User> {
    return this.prisma.user.create({ data });
  }

  update(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    return this.prisma.user.update({ where: { id }, data });
  }

  touchLogin(id: string): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: { lastLoginAt: new Date() },
    });
  }

  /**
   * Telefonu təsdiqlənmiş kimi işarələyir və Verification qeydini yeniləyir.
   * İkisi bir tranzaksiyada gedir ki, nişan və status heç vaxt ayrılmasın.
   */
  async markPhoneVerified(userId: string, phone: string): Promise<User> {
    const [user] = await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { phone, phoneVerifiedAt: new Date() },
      }),
      this.prisma.verification.upsert({
        where: { userId_type: { userId, type: 'PHONE' } },
        update: { status: 'VERIFIED', reviewedAt: new Date() },
        create: { userId, type: 'PHONE', status: 'VERIFIED', reviewedAt: new Date() },
      }),
      this.prisma.notification.create({
        data: { userId, type: 'TELEFON_TESDIQLENDI' },
      }),
      // Otaq yoldaşı profili yalnız telefon təsdiqindən sonra görünə bilər
      // (Prompt F4). Təsdiq anında aktiv profil avtomatik açılır ki,
      // istifadəçi ayrıca düymə axtarmasın.
      this.prisma.roommateProfile.updateMany({
        where: { userId, active: true },
        data: { visible: true },
      }),
    ]);
    return user;
  }

  /** Telefon təsdiqi ləğv olunanda otaq yoldaşı profili gizlədilir. */
  hideRoommateProfile(userId: string): Promise<Prisma.BatchPayload> {
    return this.prisma.roommateProfile.updateMany({
      where: { userId },
      data: { visible: false },
    });
  }
}
