import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import {
  onboardingGoToSchema,
  onboardingStepSchema,
  ownerProfileSchema,
  privacySchema,
  studentProfilePatchSchema,
  type OnboardingStepId,
} from '@yasayis/shared';
import { zodBody } from '../../common/pipes/zod-validation.pipe';
import { CurrentUser, OptionalAuth } from '../auth/decorators';
import type { AuthUser } from '../auth/auth.types';
import { OwnerProfileService } from './owner-profile.service';
import { ProfilesService } from './profiles.service';

/**
 * Tələbə profili və onboarding  (PROMPT C1)
 *
 * Onboarding uzun tək forma deyil: hər addım öz sorğusu ilə saxlanılır, ona görə
 * istifadəçi axını yarımçıq qoyub sonra qaldığı yerdən davam edə bilər.
 */
@Controller('me')
export class ProfilesController {
  constructor(
    private readonly profiles: ProfilesService,
    private readonly owner: OwnerProfileService,
  ) {}

  /**
   * Profil səhifəsinin bütün məlumatı bir sorğuda: hesab, təsdiq nişanları,
   * tələbə profili, ev sahibi profili və öz elanları.
   *
   * Rollar additiv olduğu üçün cavabda hər iki profil eyni anda dolu ola bilər —
   * client onları tab kimi göstərir, ayrıca hesaba keçid yoxdur.
   */
  @Get('overview')
  overview(@CurrentUser() actor: AuthUser) {
    return this.owner.getOverview(actor.id);
  }

  // --- Ev sahibi profili ---------------------------------------------------

  @Get('owner-profile')
  getOwnerProfile(@CurrentUser() actor: AuthUser) {
    return this.owner.getOwnProfile(actor.id);
  }

  @Patch('owner-profile')
  updateOwnerProfile(
    @CurrentUser() actor: AuthUser,
    @Body(zodBody(ownerProfileSchema)) dto: unknown,
  ) {
    return this.owner.updateOwnProfile(actor.id, dto as never);
  }

  /** Öz elanlarım — statusu ilə birlikdə (ictimai siyahıda status göstərilmir). */
  @Get('listings')
  ownListings(@CurrentUser() actor: AuthUser) {
    return this.owner.getOwnListings(actor.id);
  }

  /** Profil yoxdursa, boş qaralama yaradılır — onboardingin başlanğıc nöqtəsi. */
  @Get('student-profile')
  getOwn(@CurrentUser() actor: AuthUser) {
    return this.profiles.getOwnProfile(actor.id);
  }

  /** Bir addımı saxlayır və növbətiyə keçir. */
  @Patch('onboarding')
  saveStep(
    @CurrentUser() actor: AuthUser,
    @Body(zodBody(onboardingStepSchema)) dto: unknown,
  ) {
    return this.profiles.saveStep(actor.id, dto as never);
  }

  /** Keçilmiş addıma qayıtmaq. */
  @Post('onboarding/back')
  goBack(
    @CurrentUser() actor: AuthUser,
    @Body(zodBody(onboardingGoToSchema)) dto: unknown,
  ) {
    return this.profiles.goToStep(actor.id, (dto as { step: OnboardingStepId }).step);
  }

  /** Ötürülə bilən addımı (ixtisas) keçmək. */
  @Post('onboarding/skip')
  skip(
    @CurrentUser() actor: AuthUser,
    @Body(zodBody(onboardingGoToSchema)) dto: unknown,
  ) {
    return this.profiles.skipStep(actor.id, (dto as { step: OnboardingStepId }).step);
  }

  /** Onboarding bitəndən sonrakı redaktə. */
  @Patch('student-profile')
  update(
    @CurrentUser() actor: AuthUser,
    @Body(zodBody(studentProfilePatchSchema)) dto: unknown,
  ) {
    return this.profiles.updateProfile(actor.id, dto as never);
  }

  /** Sahə görünürlüyünü dəyişmək. */
  @Patch('student-profile/privacy')
  updatePrivacy(
    @CurrentUser() actor: AuthUser,
    @Body(zodBody(privacySchema)) dto: unknown,
  ) {
    return this.profiles.updatePrivacy(actor.id, dto as never);
  }
}

/** Başqasının profili — gizli sahələr cavaba düşmür. */
@Controller('profiles')
export class PublicProfilesController {
  constructor(private readonly profiles: ProfilesService) {}

  @OptionalAuth()
  @Get(':userId')
  get(@Param('userId') userId: string) {
    return this.profiles.getPublicProfile(userId);
  }
}
