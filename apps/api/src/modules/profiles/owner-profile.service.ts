import { Injectable, NotFoundException } from '@nestjs/common';
import { VerificationStatus } from '@yasayis/shared';
import type {
  MyListingDto,
  OwnerProfileDto,
  OwnerProfileInput,
  ProfileOverviewDto,
  VerificationStateDto,
} from '@yasayis/shared';
import { OwnerProfileRepository } from './owner-profile.repository';
import { ProfilesService } from './profiles.service';

/**
 * Ev sahibi profili və vahid profil görünüşü.
 *
 * Rollar additivdir: bir istifadəçi həm tələbə, həm ev sahibi ola bilər və bu
 * halda AYRICA HESAB yaradılmır — eyni `User` sətri hər iki profili daşıyır.
 * `getOverview` profil səhifəsinin ehtiyacı olan hər şeyi bir sorğuda qaytarır
 * ki, client dörd ardıcıl gözləmə etməsin.
 */
@Injectable()
export class OwnerProfileService {
  constructor(
    private readonly repo: OwnerProfileRepository,
    private readonly profiles: ProfilesService,
  ) {}

  /** Profil yoxdursa yaradılır — ev sahibi rolu açılan kimi boş profil hazır olur. */
  async getOwnProfile(userId: string): Promise<OwnerProfileDto> {
    const existing = await this.repo.findOwnerProfile(userId);
    const profile = existing ?? (await this.repo.createOwnerProfile(userId));
    const counts = await this.repo.countListings(userId);

    return {
      userId: profile.userId,
      about: profile.about,
      isCompany: profile.isCompany,
      companyName: profile.companyName,
      verificationStatus: profile.verificationStatus,
      listingCount: counts.total,
      activeListingCount: counts.active,
    };
  }

  async updateOwnProfile(
    userId: string,
    input: OwnerProfileInput,
  ): Promise<OwnerProfileDto> {
    await this.getOwnProfile(userId);
    await this.repo.updateOwnerProfile(userId, {
      about: input.about ?? null,
      isCompany: input.isCompany,
      // Şəxsi ev sahibinə keçəndə şirkət adı qalmasın.
      companyName: input.isCompany ? (input.companyName ?? null) : null,
    });
    return this.getOwnProfile(userId);
  }

  async getOwnListings(userId: string): Promise<MyListingDto[]> {
    const rows = await this.repo.findOwnListings(userId);

    return rows.map((l) => ({
      id: l.id,
      slug: l.slug,
      title: l.property.title,
      status: l.status,
      cityName: l.property.city.name,
      districtName: l.property.district?.name ?? null,
      price: l.property.price,
      roomCount: l.property.roomCount,
      vacantRoomCount: l.property.vacantRoomCount,
      coverImageUrl: l.property.images[0]?.url ?? null,
      viewCount: l.viewCount,
      publishedAt: l.publishedAt?.toISOString() ?? null,
      expiresAt: l.expiresAt?.toISOString() ?? null,
      rejectionReason: l.rejectionReason,
    }));
  }

  /**
   * Profil səhifəsinin bütün məlumatı.
   *
   * Yalnız aktiv rolların profili doldurulur: tələbə olmayan istifadəçidə
   * `student` null qalır, ev sahibi olmayanda `owner` null qalır.
   */
  async getOverview(userId: string): Promise<ProfileOverviewDto> {
    const user = await this.repo.findUser(userId);
    if (!user) throw new NotFoundException('Hesab tapılmadı');

    const [student, owner, listings, verifications] = await Promise.all([
      user.isStudent ? this.profiles.getOwnProfile(userId) : Promise.resolve(null),
      user.isOwner ? this.getOwnProfile(userId) : Promise.resolve(null),
      user.isOwner ? this.getOwnListings(userId) : Promise.resolve([]),
      this.repo.findVerifications(userId),
    ]);

    const statusOf = (type: 'STUDENT' | 'OWNER'): VerificationStatus =>
      verifications.find((v) => v.type === type)?.status ?? VerificationStatus.NONE;

    const state: VerificationStateDto = {
      phone: user.phoneVerifiedAt !== null,
      student: statusOf('STUDENT'),
      owner: statusOf('OWNER'),
    };

    return {
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        avatarUrl: user.avatarUrl,
        isStudent: user.isStudent,
        isOwner: user.isOwner,
        isAdmin: user.isAdmin,
        memberSince: user.createdAt.toISOString(),
      },
      verifications: state,
      student,
      owner,
      listings,
    };
  }
}
