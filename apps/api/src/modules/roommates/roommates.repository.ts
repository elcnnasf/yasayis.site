import { Injectable } from '@nestjs/common';
import type { Prisma } from '@yasayis/db';
import { PrismaService } from '../../common/prisma/prisma.service';

/** Kart və skorlama üçün lazım olan bütün əlaqələr. */
const candidateInclude = {
  user: {
    select: {
      id: true,
      fullName: true,
      avatarUrl: true,
      phoneVerifiedAt: true,
      status: true,
      deletedAt: true,
      roommateProfile: { select: { active: true, visible: true } },
      verifications: { where: { type: 'STUDENT' }, select: { status: true } },
    },
  },
  city: { select: { id: true, name: true } },
  university: { select: { id: true, name: true, shortName: true } },
  major: { select: { id: true, name: true } },
  preferredDistricts: { include: { district: { select: { id: true, name: true } } } },
} satisfies Prisma.StudentProfileInclude;

export type RoommateCandidate = Prisma.StudentProfileGetPayload<{
  include: typeof candidateInclude;
}>;

@Injectable()
export class RoommatesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findProfile(userId: string): Promise<RoommateCandidate | null> {
    return this.prisma.studentProfile.findUnique({
      where: { userId },
      include: candidateInclude,
      relationLoadStrategy: 'join',
    });
  }

  /**
   * Kəşf üçün namizədlər.
   *
   * Yalnız otaq yoldaşı profili AKTİV və GÖRÜNƏN tələbələr çıxır — `visible`
   * bayrağı isə telefon təsdiqindən sonra qoyulur, ona görə siyahıda təsdiqsiz
   * profil olmur.
   */
  findCandidates(args: {
    excludeUserId?: string;
    cityId?: string;
    universityId?: string;
    budgetMin?: number;
    budgetMax?: number;
    take: number;
  }): Promise<RoommateCandidate[]> {
    const where: Prisma.StudentProfileWhereInput = {
      user: {
        deletedAt: null,
        status: 'ACTIVE',
        isStudent: true,
        roommateProfile: { active: true, visible: true },
      },
      // Yarımçıq profil skorlanmır — nəticə yanıltıcı olardı.
      cityId: args.cityId ?? { not: null },
      lifestyle: { not: null },
      smoking: { not: null },
      petsAttitude: { not: null },
    };

    if (args.excludeUserId) where.userId = { not: args.excludeUserId };
    if (args.universityId) where.universityId = args.universityId;
    if (args.budgetMax !== undefined) where.budgetMin = { lte: args.budgetMax };
    if (args.budgetMin !== undefined) where.budgetMax = { gte: args.budgetMin };

    return this.prisma.studentProfile.findMany({
      where,
      include: candidateInclude,
      relationLoadStrategy: 'join',
      orderBy: { updatedAt: 'desc' },
      take: args.take,
    });
  }

  // --- Uyğunlaşma ----------------------------------------------------------

  /** Cüt həmişə eyni sıra ilə saxlanılır ki, dublikat qeyd yaranmasın. */
  static orderPair(a: string, b: string): [string, string] {
    return a < b ? [a, b] : [b, a];
  }

  findMatch(userA: string, userB: string) {
    const [first, second] = RoommatesRepository.orderPair(userA, userB);
    return this.prisma.roommateMatch.findUnique({
      where: { userAId_userBId: { userAId: first, userBId: second } },
      include: { jointSearch: { select: { id: true } } },
    });
  }

  findMatchById(id: string) {
    return this.prisma.roommateMatch.findUnique({
      where: { id },
      include: { jointSearch: { select: { id: true } } },
    });
  }

  createMatch(data: {
    userAId: string;
    userBId: string;
    initiatedById: string;
    scoreAtMatch: number | null;
  }) {
    return this.prisma.roommateMatch.create({ data });
  }

  updateMatch(id: string, data: Prisma.RoommateMatchUncheckedUpdateInput) {
    return this.prisma.roommateMatch.update({ where: { id }, data });
  }

  listMatches(userId: string) {
    return this.prisma.roommateMatch.findMany({
      where: { OR: [{ userAId: userId }, { userBId: userId }] },
      orderBy: { createdAt: 'desc' },
      include: {
        jointSearch: { select: { id: true } },
        userA: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
            studentProfile: { select: { university: { select: { shortName: true } } } },
          },
        },
        userB: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
            studentProfile: { select: { university: { select: { shortName: true } } } },
          },
        },
      },
    });
  }

  /** Bir istifadəçinin bütün uyğunlaşmalarının vəziyyəti — kartlarda göstərilir. */
  async matchStatuses(userId: string): Promise<Map<string, { status: string; initiatedById: string }>> {
    const rows = await this.prisma.roommateMatch.findMany({
      where: { OR: [{ userAId: userId }, { userBId: userId }] },
      select: { userAId: true, userBId: true, status: true, initiatedById: true },
    });

    return new Map(
      rows.map((r) => [
        r.userAId === userId ? r.userBId : r.userAId,
        { status: r.status, initiatedById: r.initiatedById },
      ]),
    );
  }

  // --- Birgə axtarış -------------------------------------------------------

  findJointSearch(matchId: string) {
    return this.prisma.jointSearch.findUnique({
      where: { matchId },
      include: { districts: { include: { district: { select: { id: true, name: true } } } } },
    });
  }

  upsertJointSearch(
    matchId: string,
    data: {
      budgetMin: number;
      budgetMax: number;
      roomCount: number;
      studentsOnly: boolean;
      districtIds: string[];
    },
  ) {
    const districts = { createMany: { data: data.districtIds.map((districtId) => ({ districtId })) } };

    return this.prisma.jointSearch.upsert({
      where: { matchId },
      create: {
        matchId,
        budgetMin: data.budgetMin,
        budgetMax: data.budgetMax,
        roomCount: data.roomCount,
        studentsOnly: data.studentsOnly,
        districts,
      },
      update: {
        budgetMin: data.budgetMin,
        budgetMax: data.budgetMax,
        roomCount: data.roomCount,
        studentsOnly: data.studentsOnly,
        // Rayon siyahısı tam əvəzlənir — fərq hesablamaq mürəkkəbləşdirərdi.
        districts: { deleteMany: {}, ...districts },
      },
      include: { districts: { include: { district: { select: { id: true, name: true } } } } },
    });
  }
}
