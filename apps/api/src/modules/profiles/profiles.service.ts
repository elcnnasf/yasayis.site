import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@yasayis/db';
import {
  ONBOARDING_STEP_COUNT,
  ONBOARDING_STEPS,
  stepIndexOf,
  type OnboardingStepId,
  type OnboardingStepInput,
  type OwnStudentProfileDto,
  type PrivacyInput,
  type PublicStudentProfileDto,
  type StudentProfilePatchInput,
} from '@yasayis/shared';
import { ProfilesRepository, type StudentProfileWithTaxonomy } from './profiles.repository';

/**
 * Tələbə profili və onboarding axını  (PROMPT C1)
 *
 * Axın davam etdirilə bilir: hər addım ayrıca yazılır və `onboardingStep`
 * növbəti göstəriləcək addımı saxlayır. İstifadəçi brauzeri bağlayıb sonra
 * qayıdanda qaldığı yerdən davam edir.
 *
 * Görünürlük hər sahə üçün ayrıdır. Həssas məlumat (dəqiq büdcə rəqəmi və cins
 * üstünlüyü) default olaraq GİZLİDİR — bu, sxem səviyyəsindəki `@default(false)`
 * ilə təmin olunur, burada isə heç vaxt zorla açılmır.
 */
@Injectable()
export class ProfilesService {
  constructor(private readonly repo: ProfilesRepository) {}

  // =========================================================================
  //  Öz profilim
  // =========================================================================

  /**
   * Profili qaytarır; yoxdursa boş qaralama yaradır.
   * Qeydiyyatdan sonra ilk dəfə onboarding açılanda məhz bu baş verir.
   */
  async getOwnProfile(userId: string): Promise<OwnStudentProfileDto> {
    const existing = await this.repo.findStudentProfile(userId);
    const profile = existing ?? (await this.repo.createDraft(userId));
    return toOwnDto(profile);
  }

  // =========================================================================
  //  Onboarding
  // =========================================================================

  /**
   * Bir addımı saxlayır və növbəti addıma keçir.
   *
   * İstifadəçi geri qayıdıb köhnə addımı dəyişə bilər — bu halda `onboardingStep`
   * geriyə çəkilmir, çünki sonrakı addımlar artıq doldurulub.
   */
  async saveStep(userId: string, input: OnboardingStepInput): Promise<OwnStudentProfileDto> {
    const profile = await this.requireProfile(userId);
    const index = stepIndexOf(input.step);
    const step = ONBOARDING_STEPS[index];
    if (!step) throw new BadRequestException('Belə bir addım yoxdur');

    // Addımları atlamaq olmaz: yalnız keçilmiş və ya növbəti addım yazıla bilər.
    if (index > profile.onboardingStep) {
      throw new BadRequestException('Əvvəlki addımları tamamlayın');
    }

    const data = await this.buildStepData(input);

    if ('isPublic' in input && input.isPublic !== undefined && step.privacyField) {
      data[step.privacyField] = input.isPublic;
    }

    data.onboardingStep = Math.max(profile.onboardingStep, index + 1);

    const updated = await this.repo.updateStudentProfile(userId, data);

    // Bütün addımlar keçilib və məcburi sahələr doludursa, hesab "onboarded" olur.
    if (updated.onboardingStep >= ONBOARDING_STEP_COUNT && isComplete(updated)) {
      await this.repo.markUserOnboarded(userId);
    }

    return toOwnDto(updated);
  }

  /** Geri qayıtmaq — məlumat dəyişmir, yalnız hansı ekranın açılacağı. */
  async goToStep(userId: string, step: OnboardingStepId): Promise<OwnStudentProfileDto> {
    const profile = await this.requireProfile(userId);
    const index = stepIndexOf(step);

    if (index > profile.onboardingStep) {
      throw new BadRequestException('Bu addıma hələ keçmək olmaz');
    }

    // `onboardingStep` irəliləyişin ölçüsüdür, cari ekran deyil — geri baxmaq
    // onu azaltmır. Client hansı ekranı göstərdiyini özü idarə edir.
    return toOwnDto(profile);
  }

  /** İxtisas addımı ötürülə bilər. */
  async skipStep(userId: string, step: OnboardingStepId): Promise<OwnStudentProfileDto> {
    const index = stepIndexOf(step);
    const definition = ONBOARDING_STEPS[index];

    if (!definition?.optional) {
      throw new BadRequestException('Bu addım ötürülə bilməz');
    }

    const profile = await this.requireProfile(userId);
    const updated = await this.repo.updateStudentProfile(userId, {
      onboardingStep: Math.max(profile.onboardingStep, index + 1),
    });
    return toOwnDto(updated);
  }

  // =========================================================================
  //  Redaktə
  // =========================================================================

  async updateProfile(
    userId: string,
    input: StudentProfilePatchInput,
  ): Promise<OwnStudentProfileDto> {
    await this.requireProfile(userId);

    if (input.cityId) await this.assertTaxonomy('city', input.cityId);
    if (input.universityId) await this.assertTaxonomy('university', input.universityId);
    if (input.majorId) await this.assertTaxonomy('major', input.majorId);

    const updated = await this.repo.updateStudentProfile(
      userId,
      input as Prisma.StudentProfileUncheckedUpdateInput,
    );
    return toOwnDto(updated);
  }

  async updatePrivacy(userId: string, input: PrivacyInput): Promise<OwnStudentProfileDto> {
    await this.requireProfile(userId);
    const updated = await this.repo.updateStudentProfile(userId, input);
    return toOwnDto(updated);
  }

  // =========================================================================
  //  Başqasının profili
  // =========================================================================

  /**
   * Gizlədilmiş sahələr cavaba ƏLAVƏ OLUNMUR — boş dəyərlə yox, ümumiyyətlə yox.
   * Belə olanda client səhvən "doldurulmayıb" ilə "gizlədilib" arasında fərqi itirmir.
   */
  async getPublicProfile(userId: string): Promise<PublicStudentProfileDto> {
    const row = await this.repo.findPublicProfile(userId);

    if (!row || row.user.deletedAt || row.user.status !== 'ACTIVE') {
      throw new NotFoundException('Profil tapılmadı');
    }

    const dto: PublicStudentProfileDto = {
      userId: row.userId,
      fullName: row.user.fullName,
      avatarUrl: row.user.avatarUrl,
      // Şəhər həmişə görünür: axtarış və uyğunluq onsuz işləmir.
      cityName: row.city?.name ?? null,
      phoneVerified: row.user.phoneVerifiedAt !== null,
      studentVerified: row.user.verifications.some((v) => v.status === 'VERIFIED'),
    };

    if (row.universityIsPublic) dto.universityName = row.university?.name ?? null;
    if (row.majorIsPublic) dto.majorName = row.major?.name ?? null;
    if (row.bioIsPublic) dto.bio = row.bio;
    if (row.budgetIsPublic) {
      dto.budgetMin = row.budgetMin;
      dto.budgetMax = row.budgetMax;
    }
    if (row.lifestyleIsPublic) dto.lifestyle = row.lifestyle;
    if (row.smokingIsPublic) dto.smoking = row.smoking;
    if (row.petsAttitudeIsPublic) dto.petsAttitude = row.petsAttitude;
    if (row.genderPreferenceIsPublic) dto.genderPreference = row.genderPreference;
    if (row.lookingForIsPublic) dto.lookingFor = row.lookingFor;

    return dto;
  }

  // =========================================================================
  //  Köməkçi
  // =========================================================================

  private async requireProfile(userId: string): Promise<StudentProfileWithTaxonomy> {
    const profile = await this.repo.findStudentProfile(userId);
    if (!profile) {
      throw new ForbiddenException('Əvvəlcə tələbə profilini başladın');
    }
    return profile;
  }

  private async assertTaxonomy(
    kind: 'city' | 'university' | 'major',
    id: string,
  ): Promise<void> {
    if (!(await this.repo.taxonomyExists(kind, id))) {
      const names = { city: 'Şəhər', university: 'Universitet', major: 'İxtisas' };
      throw new BadRequestException(`${names[kind]} tapılmadı və ya aktiv deyil`);
    }
  }

  /** Addımın yükünü baza sahələrinə çevirir və taksonomiya id-lərini yoxlayır. */
  private async buildStepData(
    input: OnboardingStepInput,
  ): Promise<Prisma.StudentProfileUncheckedUpdateInput & Record<string, unknown>> {
    switch (input.step) {
      case 'lookingFor':
        return { lookingFor: input.lookingFor };

      case 'city':
        await this.assertTaxonomy('city', input.cityId);
        return { cityId: input.cityId };

      case 'university':
        await this.assertTaxonomy('university', input.universityId);
        return { universityId: input.universityId };

      case 'major':
        if (input.majorId) await this.assertTaxonomy('major', input.majorId);
        return { majorId: input.majorId };

      case 'budget':
        return { budgetMin: input.budgetMin, budgetMax: input.budgetMax };

      case 'lifestyle':
        return { lifestyle: input.lifestyle };

      case 'smoking':
        return { smoking: input.smoking };

      case 'pets':
        return { petsAttitude: input.petsAttitude };

      case 'gender':
        return { genderPreference: input.genderPreference };
    }
  }
}

/**
 * Profil "tam"dırmı.
 *
 * İxtisas (`majorId`) məcburi deyil — ötürülə bilər, ona görə buraya daxil edilmir.
 * Uyğunluq skoru yalnız tam profillər üçün hesablanır.
 */
function isComplete(p: StudentProfileWithTaxonomy): boolean {
  return (
    p.cityId !== null &&
    p.universityId !== null &&
    p.lookingFor !== null &&
    p.lifestyle !== null &&
    p.smoking !== null &&
    p.petsAttitude !== null &&
    p.genderPreference !== null &&
    p.budgetMin !== null &&
    p.budgetMax !== null
  );
}

function toOwnDto(p: StudentProfileWithTaxonomy): OwnStudentProfileDto {
  return {
    userId: p.userId,
    cityId: p.cityId,
    cityName: p.city?.name ?? null,
    universityId: p.universityId,
    universityName: p.university?.name ?? null,
    majorId: p.majorId,
    majorName: p.major?.name ?? null,
    bio: p.bio,
    budgetMin: p.budgetMin,
    budgetMax: p.budgetMax,
    lifestyle: p.lifestyle,
    smoking: p.smoking,
    petsAttitude: p.petsAttitude,
    genderPreference: p.genderPreference,
    lookingFor: p.lookingFor,
    privacy: {
      bioIsPublic: p.bioIsPublic,
      budgetIsPublic: p.budgetIsPublic,
      lifestyleIsPublic: p.lifestyleIsPublic,
      smokingIsPublic: p.smokingIsPublic,
      petsAttitudeIsPublic: p.petsAttitudeIsPublic,
      genderPreferenceIsPublic: p.genderPreferenceIsPublic,
      lookingForIsPublic: p.lookingForIsPublic,
      universityIsPublic: p.universityIsPublic,
      majorIsPublic: p.majorIsPublic,
    },
    onboardingStep: p.onboardingStep,
    isComplete: isComplete(p),
  };
}
