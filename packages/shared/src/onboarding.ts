/**
 * Tələbə onboarding axını — 9 addım  (PROMPT C1)
 *
 * Addımların sırası, sualları və hansı sahəyə yazıldığı BURADA dayanır.
 * Həm web forması, həm API validasiyası bu siyahıdan oxuyur — addım əlavə
 * olunanda iki yerdə dəyişiklik etməyə ehtiyac qalmır.
 *
 * Axın davam etdirilə bilir (resumable): hər addım ayrıca saxlanılır və
 * `StudentProfile.onboardingStep` növbəti göstəriləcək addımı saxlayır.
 * Uzun tək forma DEYİL — hər ekranda bir sual var.
 */

import {
  GenderPreference,
  Lifestyle,
  LookingFor,
  PetsAttitude,
  SmokingHabit,
} from './enums';
import {
  genderPreferenceLabels,
  lifestyleLabels,
  lookingForLabels,
  smokingHabitLabels,
} from './labels';

export const ONBOARDING_STEP_IDS = [
  'lookingFor',
  'city',
  'university',
  'major',
  'budget',
  'lifestyle',
  'smoking',
  'pets',
  'gender',
] as const;

export type OnboardingStepId = (typeof ONBOARDING_STEP_IDS)[number];

export const ONBOARDING_STEP_COUNT = ONBOARDING_STEP_IDS.length;

/** Profilin hansı görünürlük bayrağını idarə edən sahə adları. */
export type PrivacyField =
  | 'bioIsPublic'
  | 'budgetIsPublic'
  | 'lifestyleIsPublic'
  | 'smokingIsPublic'
  | 'petsAttitudeIsPublic'
  | 'genderPreferenceIsPublic'
  | 'lookingForIsPublic'
  | 'universityIsPublic'
  | 'majorIsPublic';

export interface OnboardingStep {
  id: OnboardingStepId;
  /** Stepper-də göstərilən qısa ad. */
  label: string;
  /** Ekranın əsas sualı. */
  question: string;
  /** Sualın altındakı izah. */
  hint?: string;
  /** Bu addım ötürülə bilər. */
  optional?: boolean;
  /** Bu addımın idarə etdiyi görünürlük bayrağı (varsa). */
  privacyField?: PrivacyField;
  /**
   * Görünürlüyün ilkin dəyəri.
   * Həssas şəxsi məlumat (dəqiq büdcə rəqəmi, cins üstünlüyü) default GİZLİDİR.
   */
  defaultPublic?: boolean;
}

export const ONBOARDING_STEPS: readonly OnboardingStep[] = [
  {
    id: 'lookingFor',
    label: 'Axtarış',
    question: 'Sən nə axtarırsan?',
    hint: 'Sonradan dəyişə bilərsən — bu, yalnız başlanğıc nöqtəsidir.',
    privacyField: 'lookingForIsPublic',
    defaultPublic: true,
  },
  {
    id: 'city',
    label: 'Şəhər',
    question: 'Hansı şəhərdə yaşayacaqsan?',
    hint: 'Axtarış nəticələri bu şəhərə görə göstəriləcək.',
  },
  {
    id: 'university',
    label: 'Universitet',
    question: 'Harada oxuyursan?',
    hint: 'Siyahıda yoxdursa, "Digər / siyahıda yoxdur" seç.',
    privacyField: 'universityIsPublic',
    defaultPublic: true,
  },
  {
    id: 'major',
    label: 'İxtisas',
    question: 'İxtisasın nədir?',
    hint: 'Bu addımı ötürə bilərsən.',
    optional: true,
    privacyField: 'majorIsPublic',
    defaultPublic: true,
  },
  {
    id: 'budget',
    label: 'Büdcə',
    question: 'Aylıq büdcən nə qədərdir?',
    hint: 'Dəqiq rəqəm default olaraq gizlidir — başqaları yalnız uyğunluq hesablamasında istifadə olunduğunu görür.',
    privacyField: 'budgetIsPublic',
    defaultPublic: false,
  },
  {
    id: 'lifestyle',
    label: 'Həyat tərzi',
    question: 'Evdə həyat tərzin necədir?',
    hint: 'Uyğunluq skorunda ən ağır çəkiyə malik amillərdən biridir.',
    privacyField: 'lifestyleIsPublic',
    defaultPublic: true,
  },
  {
    id: 'smoking',
    label: 'Siqaret',
    question: 'Siqaret çəkirsən?',
    privacyField: 'smokingIsPublic',
    defaultPublic: true,
  },
  {
    id: 'pets',
    label: 'Ev heyvanı',
    question: 'Ev heyvanlarına münasibətin necədir?',
    privacyField: 'petsAttitudeIsPublic',
    defaultPublic: true,
  },
  {
    id: 'gender',
    label: 'Cins üstünlüyü',
    question: 'Otaq yoldaşı üçün cins üstünlüyün varmı?',
    hint: 'Bu seçim default olaraq gizlidir — yalnız uyğun profilləri süzmək üçün işlənir.',
    privacyField: 'genderPreferenceIsPublic',
    defaultPublic: false,
  },
];

/** Həssas sahələr: görünürlüyü default olaraq bağlıdır. */
export const PRIVATE_BY_DEFAULT: readonly PrivacyField[] = ONBOARDING_STEPS.filter(
  (s) => s.privacyField && s.defaultPublic === false,
).map((s) => s.privacyField as PrivacyField);

export const stepIndexOf = (id: OnboardingStepId): number =>
  ONBOARDING_STEP_IDS.indexOf(id);

// ---------------------------------------------------------------------------
// Seçim variantları
// ---------------------------------------------------------------------------

const toOptions = <T extends string>(labels: Record<T, string>) =>
  (Object.keys(labels) as T[]).map((value) => ({ value, label: labels[value] }));

export const lookingForOptions = toOptions<LookingFor>(lookingForLabels);
export const lifestyleOptions = toOptions<Lifestyle>(lifestyleLabels);
export const smokingOptions = toOptions<SmokingHabit>(smokingHabitLabels);
export const genderPreferenceOptions = toOptions<GenderPreference>(genderPreferenceLabels);

/** Ev heyvanları sualı onboardingdə daha uzun ifadə ilə verilir. */
export const petsOptions: { value: PetsAttitude; label: string }[] = [
  { value: PetsAttitude.SEVIREM, label: 'Heyvanları sevirəm' },
  { value: PetsAttitude.PROBLEM_DEYIL, label: 'Problem deyil' },
  { value: PetsAttitude.ISTEMIREM, label: 'Heyvan istəmirəm' },
];

/** Cins üstünlüyü sualında "Fərqi yoxdur" daha aydın yazılır. */
export const genderPreferenceOnboardingOptions: {
  value: GenderPreference;
  label: string;
  description?: string;
}[] = [
  { value: GenderPreference.QADIN, label: 'Qadın' },
  { value: GenderPreference.KISI, label: 'Kişi' },
  {
    value: GenderPreference.FERQI_YOXDUR,
    label: 'Fərqi yoxdur',
    description: 'Daha çox uyğun profil görəcəksən',
  },
];
