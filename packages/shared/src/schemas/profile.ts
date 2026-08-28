/**
 * Profil sxemləri.
 *
 * Tələbə profilinin hər məzmun sahəsinin yanında ayrıca `*IsPublic` bayrağı var:
 * istifadəçi hansı məlumatın başqalarına görünəcəyini özü seçir. Serverdə profil
 * qaytarılanda gizli sahələr cavaba ümumiyyətlə əlavə olunmur.
 */

import { z } from 'zod';
import { PRICE, PROFILE } from '../constants';
import {
  GenderPreference,
  Lifestyle,
  LookingFor,
  PetsAttitude,
  SmokingHabit,
  VerificationStatus,
  values,
} from '../enums';
import { ONBOARDING_STEP_IDS } from '../onboarding';
import { emailSchema, idSchema } from './common';

export const updateAccountSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(PROFILE.FULL_NAME_MIN, 'Ad və soyadınızı yazın')
    .max(PROFILE.FULL_NAME_MAX, 'Çox uzundur')
    .optional(),
  email: emailSchema.nullish(),
  avatarUrl: z.string().url('Yanlış ünvan').nullish(),
});
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;

// ---------------------------------------------------------------------------
// Görünürlük
// ---------------------------------------------------------------------------

/**
 * Sahə görünürlüyü.
 * Hamısı istəyə bağlıdır — göndərilməyən bayraq dəyişmir.
 */
export const privacySchema = z.object({
  bioIsPublic: z.boolean().optional(),
  budgetIsPublic: z.boolean().optional(),
  lifestyleIsPublic: z.boolean().optional(),
  smokingIsPublic: z.boolean().optional(),
  petsAttitudeIsPublic: z.boolean().optional(),
  genderPreferenceIsPublic: z.boolean().optional(),
  lookingForIsPublic: z.boolean().optional(),
  universityIsPublic: z.boolean().optional(),
  majorIsPublic: z.boolean().optional(),
});
export type PrivacyInput = z.infer<typeof privacySchema>;

// ---------------------------------------------------------------------------
// Tam profil (onboarding bitəndən sonrakı redaktə)
// ---------------------------------------------------------------------------

const budgetRange = {
  budgetMin: z.number().int().min(0).max(PRICE.MAX, 'Büdcə çox yüksəkdir').nullish(),
  budgetMax: z.number().int().min(0).max(PRICE.MAX, 'Büdcə çox yüksəkdir').nullish(),
};

const budgetOrderOk = (d: { budgetMin?: number | null; budgetMax?: number | null }) =>
  d.budgetMin == null || d.budgetMax == null || d.budgetMin <= d.budgetMax;

export const studentProfileSchema = z
  .object({
    universityId: idSchema,
    majorId: idSchema.nullish(),
    cityId: idSchema,
    bio: z.string().trim().max(PROFILE.BIO_MAX, 'Çox uzundur').nullish(),
    ...budgetRange,
    lifestyle: z.enum(values(Lifestyle), { required_error: 'Seçim edin' }),
    smoking: z.enum(values(SmokingHabit), { required_error: 'Seçim edin' }),
    petsAttitude: z.enum(values(PetsAttitude), { required_error: 'Seçim edin' }),
    genderPreference: z.enum(values(GenderPreference), { required_error: 'Seçim edin' }),
    lookingFor: z.enum(values(LookingFor), { required_error: 'Seçim edin' }),
  })
  .merge(privacySchema)
  .refine(budgetOrderOk, {
    message: 'Minimum büdcə maksimumdan böyük ola bilməz',
    path: ['budgetMax'],
  });
export type StudentProfileInput = z.infer<typeof studentProfileSchema>;

/** Hissə-hissə redaktə (profil səhifəsi). */
export const studentProfilePatchSchema = studentProfileSchema
  .innerType()
  .partial()
  .refine(budgetOrderOk, {
    message: 'Minimum büdcə maksimumdan böyük ola bilməz',
    path: ['budgetMax'],
  });
export type StudentProfilePatchInput = z.infer<typeof studentProfilePatchSchema>;

// ---------------------------------------------------------------------------
// Onboarding — addım-addım saxlama
// ---------------------------------------------------------------------------

/**
 * Bir addımın yükü.
 *
 * Hər addım ayrıca göndərilir ki, istifadəçi axını yarımçıq qoyub sonra davam
 * etdirə bilsin. `isPublic` həmin addımın idarə etdiyi görünürlük bayrağıdır —
 * addımın öz ekranında dəyişdirilir, ayrıca "məxfilik" səhifəsində deyil.
 */
export const onboardingStepSchema = z.discriminatedUnion('step', [
  z.object({
    step: z.literal('lookingFor'),
    lookingFor: z.enum(values(LookingFor), { required_error: 'Bir variant seçin' }),
    isPublic: z.boolean().optional(),
  }),
  z.object({
    step: z.literal('city'),
    cityId: idSchema,
  }),
  z.object({
    step: z.literal('university'),
    universityId: idSchema,
    isPublic: z.boolean().optional(),
  }),
  z.object({
    step: z.literal('major'),
    /** null = "ötür" seçilib. */
    majorId: idSchema.nullable(),
    isPublic: z.boolean().optional(),
  }),
  z.object({
    step: z.literal('budget'),
    budgetMin: z.number().int().min(0).max(PRICE.MAX, 'Büdcə çox yüksəkdir'),
    budgetMax: z.number().int().min(0).max(PRICE.MAX, 'Büdcə çox yüksəkdir'),
    isPublic: z.boolean().optional(),
  }),
  z.object({
    step: z.literal('lifestyle'),
    lifestyle: z.enum(values(Lifestyle), { required_error: 'Bir variant seçin' }),
    isPublic: z.boolean().optional(),
  }),
  z.object({
    step: z.literal('smoking'),
    smoking: z.enum(values(SmokingHabit), { required_error: 'Bir variant seçin' }),
    isPublic: z.boolean().optional(),
  }),
  z.object({
    step: z.literal('pets'),
    petsAttitude: z.enum(values(PetsAttitude), { required_error: 'Bir variant seçin' }),
    isPublic: z.boolean().optional(),
  }),
  z.object({
    step: z.literal('gender'),
    genderPreference: z.enum(values(GenderPreference), {
      required_error: 'Bir variant seçin',
    }),
    isPublic: z.boolean().optional(),
  }),
])
  // `discriminatedUnion` variantların içində `.refine()` qəbul etmir
  // (ZodEffects deyil, ZodObject gözləyir), ona görə büdcə sırasının
  // yoxlanması birliyin özünə qoyulur.
  .superRefine((data, ctx) => {
    if (data.step === 'budget' && data.budgetMin > data.budgetMax) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['budgetMax'],
        message: 'Minimum büdcə maksimumdan böyük ola bilməz',
      });
    }
  });
export type OnboardingStepInput = z.infer<typeof onboardingStepSchema>;

/** Geri qayıtmaq: yalnız artıq keçilmiş addıma icazə verilir (serverdə yoxlanılır). */
export const onboardingGoToSchema = z.object({
  step: z.enum(ONBOARDING_STEP_IDS),
});
export type OnboardingGoToInput = z.infer<typeof onboardingGoToSchema>;

// ---------------------------------------------------------------------------
// Digər profillər
// ---------------------------------------------------------------------------

export const ownerProfileSchema = z
  .object({
    about: z.string().trim().max(PROFILE.ABOUT_MAX, 'Çox uzundur').nullish(),
    isCompany: z.boolean().default(false),
    companyName: z.string().trim().max(160).nullish(),
  })
  .refine((d) => !d.isCompany || !!d.companyName?.trim(), {
    message: 'Şirkət adını yazın',
    path: ['companyName'],
  });
export type OwnerProfileInput = z.infer<typeof ownerProfileSchema>;

/**
 * Otaq yoldaşı profili.
 * `visible` yalnız telefon təsdiqindən sonra true ola bilər — bu qayda serverdə
 * məcburidir, client-in göndərdiyi dəyər tək başına kifayət etmir.
 */
export const roommateProfileSchema = z.object({
  active: z.boolean().default(true),
  visible: z.boolean().default(false),
});
export type RoommateProfileInput = z.infer<typeof roommateProfileSchema>;

// ---------------------------------------------------------------------------
// Cavab tipləri
// ---------------------------------------------------------------------------

/** Öz profilim — bütün sahələr, görünürlük bayraqları ilə birlikdə. */
export interface OwnStudentProfileDto {
  userId: string;
  cityId: string | null;
  cityName: string | null;
  universityId: string | null;
  universityName: string | null;
  majorId: string | null;
  majorName: string | null;
  bio: string | null;
  budgetMin: number | null;
  budgetMax: number | null;
  lifestyle: Lifestyle | null;
  smoking: SmokingHabit | null;
  petsAttitude: PetsAttitude | null;
  genderPreference: GenderPreference | null;
  lookingFor: LookingFor | null;
  privacy: Required<PrivacyInput>;
  /** Növbəti göstəriləcək addımın indeksi (0–9). */
  onboardingStep: number;
  /** Bütün məcburi sahələr doludurmu. */
  isComplete: boolean;
}

/**
 * Başqasının gördüyü profil.
 * Gizli sahələr burada ümumiyyətlə olmur (`undefined`) — `null` ilə qarışdırmayın:
 * `null` "doldurulmayıb", `undefined` "gizlədilib" deməkdir.
 */
export interface PublicStudentProfileDto {
  userId: string;
  fullName: string;
  avatarUrl: string | null;
  cityName: string | null;
  phoneVerified: boolean;
  studentVerified: boolean;
  universityName?: string | null;
  majorName?: string | null;
  bio?: string | null;
  budgetMin?: number | null;
  budgetMax?: number | null;
  lifestyle?: Lifestyle | null;
  smoking?: SmokingHabit | null;
  petsAttitude?: PetsAttitude | null;
  genderPreference?: GenderPreference | null;
  lookingFor?: LookingFor | null;
}

// ---------------------------------------------------------------------------
// Ev sahibi profili və vahid profil görünüşü
// ---------------------------------------------------------------------------

export interface OwnerProfileDto {
  userId: string;
  about: string | null;
  isCompany: boolean;
  companyName: string | null;
  /** Nişan yeri: hazırda təsdiq axını işə salınmayıb, dəyər NONE olur. */
  verificationStatus: VerificationStatus;
  listingCount: number;
  activeListingCount: number;
}

/** Təsdiq nişanlarının vəziyyəti (Prompt F4). */
export interface VerificationStateDto {
  phone: boolean;
  student: VerificationStatus;
  owner: VerificationStatus;
}

/**
 * Profil səhifəsinin bütün məlumatı bir sorğuda.
 *
 * Rollar additivdir: `student` və `owner` eyni anda dolu ola bilər — bu halda
 * səhifə iki bölmə arasında keçid göstərir, AYRICA HESAB YARADILMIR.
 */
export interface ProfileOverviewDto {
  user: {
    id: string;
    fullName: string;
    email: string | null;
    phone: string | null;
    avatarUrl: string | null;
    isStudent: boolean;
    isOwner: boolean;
    isAdmin: boolean;
    memberSince: string;
  };
  verifications: VerificationStateDto;
  student: OwnStudentProfileDto | null;
  owner: OwnerProfileDto | null;
  listings: MyListingDto[];
}

/** Öz elanım — sahibi statusu da görür, ictimai siyahıda status göstərilmir. */
export interface MyListingDto {
  id: string;
  slug: string;
  title: string;
  status: import('../enums').ListingStatus;
  cityName: string;
  districtName: string | null;
  price: number;
  roomCount: number;
  vacantRoomCount: number;
  coverImageUrl: string | null;
  viewCount: number;
  publishedAt: string | null;
  expiresAt: string | null;
  rejectionReason: string | null;
}
