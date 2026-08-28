import { Injectable } from '@nestjs/common';
import type { Prisma } from '@yasayis/db';
import { PrismaService } from '../../common/prisma/prisma.service';

/** Taksonomiya adları profil cavabında lazımdır, ona görə həmişə birlikdə oxunur. */
const withTaxonomy = {
  city: { select: { id: true, name: true } },
  university: { select: { id: true, name: true, shortName: true } },
  major: { select: { id: true, name: true } },
} satisfies Prisma.StudentProfileInclude;

export type StudentProfileWithTaxonomy = Prisma.StudentProfileGetPayload<{
  include: typeof withTaxonomy;
}>;

@Injectable()
export class ProfilesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findStudentProfile(userId: string): Promise<StudentProfileWithTaxonomy | null> {
    return this.prisma.studentProfile.findUnique({
      where: { userId },
      include: withTaxonomy,
    });
  }

  /** Onboarding başlayanda boş qaralama yaradılır — bütün sahələr null qalır. */
  createDraft(userId: string): Promise<StudentProfileWithTaxonomy> {
    return this.prisma.studentProfile.create({
      data: { userId },
      include: withTaxonomy,
    });
  }

  updateStudentProfile(
    userId: string,
    data: Prisma.StudentProfileUncheckedUpdateInput,
  ): Promise<StudentProfileWithTaxonomy> {
    return this.prisma.studentProfile.update({
      where: { userId },
      data,
      include: withTaxonomy,
    });
  }

  /** Başqasının profili — ad, avatar və təsdiq nişanları da lazımdır. */
  findPublicProfile(userId: string) {
    return this.prisma.studentProfile.findUnique({
      where: { userId },
      include: {
        ...withTaxonomy,
        user: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
            phoneVerifiedAt: true,
            status: true,
            deletedAt: true,
            verifications: {
              where: { type: 'STUDENT' },
              select: { status: true },
            },
          },
        },
      },
    });
  }

  markUserOnboarded(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { onboardedAt: new Date() },
      select: { id: true, onboardedAt: true },
    });
  }

  /** Seçilən şəhər/universitet/ixtisas həqiqətən mövcud və aktivdirmi. */
  async taxonomyExists(
    kind: 'city' | 'university' | 'major',
    id: string,
  ): Promise<boolean> {
    const where = { id, isActive: true };
    const count =
      kind === 'city'
        ? await this.prisma.city.count({ where })
        : kind === 'university'
          ? await this.prisma.university.count({ where })
          : await this.prisma.major.count({ where });
    return count > 0;
  }
}
