/**
 * Uyğunluq skoru — deterministik, çəkili formula.
 *
 * AI YOXDUR. Nəticə eyni girişlə həmişə eynidir və hər amilin payı izah edilir.
 *
 * Gələcəkdə formula AI-əsaslı modellə əvəzlənə bilsin deyə hesablama
 * `MatchScorer` interfeysinin arxasındadır: yeni implementasiya yazmaq
 * kifayətdir, çağıran kod dəyişmir.
 */

import {
  GenderPreference,
  Lifestyle,
  PetsAttitude,
  SmokingHabit,
} from '../enums';
import {
  DIFF_HIGHLIGHT_MAX,
  FACTOR_KEYS,
  FACTOR_LABELS,
  type FactorKey,
  type MatchingWeights,
  MATCH_HIGHLIGHT_MIN,
  SCORE_EXPLANATION,
  totalWeight,
} from './weights';

// ---------------------------------------------------------------------------
// Tiplər
// ---------------------------------------------------------------------------

/** Skorlama üçün lazım olan profil məlumatı. */
export interface MatchCandidate {
  userId: string;
  gender: 'QADIN' | 'KISI';
  genderPreference: GenderPreference | null;
  cityId: string | null;
  /** Axtardığı rayonlar — boşdursa bütün şəhər. */
  districtIds: string[];
  universityId: string | null;
  lifestyle: Lifestyle | null;
  smoking: SmokingHabit | null;
  petsAttitude: PetsAttitude | null;
  budgetMin: number | null;
  budgetMax: number | null;
  /** İstədiyi otaq sayı — məlum deyilsə null. */
  roomCount?: number | null;
}

export interface FactorResult {
  key: FactorKey;
  label: string;
  weight: number;
  /** 0–1 */
  similarity: number;
  /** Bu amilin ümumi skora verdiyi bal. */
  points: number;
  positive: string;
  negative: string;
}

export interface MatchResult {
  /** 0–100, tam ədəd. UI-da "91% uyğun" kimi göstərilir. */
  score: number;
  factors: FactorResult[];
  matches: string[];
  difference: string | null;
  /** Həmişə eyni mətn — istifadəçi rəqəmin haradan gəldiyini bilməlidir. */
  explanation: string;
}

/**
 * Skorlama strategiyası.
 *
 * Hazırda yalnız `WeightedMatchScorer` var. Gələcəkdə AI-əsaslı model
 * bu interfeysi tətbiq edəcək və DI ilə əvəzlənəcək — service, controller
 * və UI dəyişməyəcək.
 */
export interface MatchScorer {
  readonly name: string;
  score(viewer: MatchCandidate, other: MatchCandidate): MatchResult;
}

// ---------------------------------------------------------------------------
// Sərt filtrlər
// ---------------------------------------------------------------------------

/**
 * Nəticə siyahısına düşmək üçün minimal şərtlər.
 * Biri pozulursa, namizəd ümumiyyətlə göstərilmir — aşağı skorla yox.
 */
export function passesHardFilters(viewer: MatchCandidate, other: MatchCandidate): boolean {
  if (viewer.userId === other.userId) return false;
  if (viewer.cityId && other.cityId && viewer.cityId !== other.cityId) return false;
  return genderPreferenceOk(viewer, other) && genderPreferenceOk(other, viewer);
}

function genderPreferenceOk(viewer: MatchCandidate, other: MatchCandidate): boolean {
  if (!viewer.genderPreference || viewer.genderPreference === GenderPreference.FERQI_YOXDUR) {
    return true;
  }
  return viewer.genderPreference === other.gender;
}

// ---------------------------------------------------------------------------
// Amil hesablamaları
// ---------------------------------------------------------------------------

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/** Məlumat yoxdursa amil neytral sayılır — cəzalandırılmır. */
const NEUTRAL = 0.6;

/** İki büdcə aralığının kəsişməsinin birləşməyə nisbəti. */
function budgetSimilarity(a: MatchCandidate, b: MatchCandidate): number {
  if (a.budgetMin == null || a.budgetMax == null) return NEUTRAL;
  if (b.budgetMin == null || b.budgetMax == null) return NEUTRAL;

  const overlap = Math.min(a.budgetMax, b.budgetMax) - Math.max(a.budgetMin, b.budgetMin);
  if (overlap <= 0) return 0;

  const union = Math.max(a.budgetMax, b.budgetMax) - Math.min(a.budgetMin, b.budgetMin);
  return union <= 0 ? 1 : clamp01(overlap / union);
}

/** Şəhər eynidirsə baza bal; rayon seçimləri də kəsişirsə tam bal. */
function locationSimilarity(a: MatchCandidate, b: MatchCandidate): number {
  if (!a.cityId || !b.cityId) return NEUTRAL;
  if (a.cityId !== b.cityId) return 0;

  // Heç biri rayon seçməyibsə, şəhər uyğunluğu kifayətdir.
  if (a.districtIds.length === 0 || b.districtIds.length === 0) return 0.8;

  const shared = a.districtIds.filter((id) => b.districtIds.includes(id)).length;
  if (shared === 0) return 0.5;

  const smaller = Math.min(a.districtIds.length, b.districtIds.length);
  return clamp01(0.8 + 0.2 * (shared / smaller));
}

function universitySimilarity(a: MatchCandidate, b: MatchCandidate): number {
  if (!a.universityId || !b.universityId) return NEUTRAL;
  return a.universityId === b.universityId ? 1 : 0.3;
}

/** "Fərqi yoxdur" hər şeylə uzlaşır, amma tam uyğunluq qədər güclü deyil. */
function lifestyleSimilarity(a: Lifestyle | null, b: Lifestyle | null): number {
  if (!a || !b) return NEUTRAL;
  if (a === b && a !== Lifestyle.FERQI_YOXDUR) return 1;
  if (a === Lifestyle.FERQI_YOXDUR || b === Lifestyle.FERQI_YOXDUR) return 0.75;
  return 0;
}

function smokingSimilarity(a: SmokingHabit | null, b: SmokingHabit | null): number {
  if (!a || !b) return NEUTRAL;
  if (a === b && a !== SmokingHabit.FERQI_YOXDUR) return 1;
  if (a === SmokingHabit.FERQI_YOXDUR || b === SmokingHabit.FERQI_YOXDUR) return 0.75;
  return 0;
}

const PET_LEVEL: Record<PetsAttitude, number> = {
  [PetsAttitude.SEVIREM]: 2,
  [PetsAttitude.PROBLEM_DEYIL]: 1,
  [PetsAttitude.ISTEMIREM]: 0,
};

function petsSimilarity(a: PetsAttitude | null, b: PetsAttitude | null): number {
  if (!a || !b) return NEUTRAL;
  const diff = Math.abs(PET_LEVEL[a] - PET_LEVEL[b]);
  return diff === 0 ? 1 : diff === 1 ? 0.6 : 0;
}

/**
 * Cins üstünlüyü sərt filtrdən keçib, burada onun "nə qədər rahat" olduğu ölçülür:
 * hər ikisi konkret seçim edibsə tam bal, biri "fərqi yoxdur" deyibsə bir az az.
 * Otaq sayı məlumdursa fərqi də nəzərə alınır.
 */
function genderAndRoomSimilarity(a: MatchCandidate, b: MatchCandidate): number {
  const bothSpecific =
    a.genderPreference &&
    b.genderPreference &&
    a.genderPreference !== GenderPreference.FERQI_YOXDUR &&
    b.genderPreference !== GenderPreference.FERQI_YOXDUR;

  const genderPart = bothSpecific ? 1 : a.genderPreference && b.genderPreference ? 0.8 : NEUTRAL;

  if (a.roomCount == null || b.roomCount == null) return genderPart;

  const roomPart = a.roomCount === b.roomCount ? 1 : Math.abs(a.roomCount - b.roomCount) === 1 ? 0.6 : 0.2;
  return clamp01(genderPart * 0.6 + roomPart * 0.4);
}

// ---------------------------------------------------------------------------
// Çəkili implementasiya
// ---------------------------------------------------------------------------

export class WeightedMatchScorer implements MatchScorer {
  readonly name = 'weighted-v1';

  constructor(private readonly weights: MatchingWeights) {}

  score(viewer: MatchCandidate, other: MatchCandidate): MatchResult {
    const similarities: Record<FactorKey, number> = {
      budget: budgetSimilarity(viewer, other),
      location: locationSimilarity(viewer, other),
      university: universitySimilarity(viewer, other),
      lifestyle: lifestyleSimilarity(viewer.lifestyle, other.lifestyle),
      smoking: smokingSimilarity(viewer.smoking, other.smoking),
      pets: petsSimilarity(viewer.petsAttitude, other.petsAttitude),
      genderAndRoom: genderAndRoomSimilarity(viewer, other),
    };

    const texts = buildTexts(viewer, other);

    const factors: FactorResult[] = FACTOR_KEYS.map((key) => {
      const weight = this.weights[key] ?? 0;
      const similarity = similarities[key];
      return {
        key,
        label: FACTOR_LABELS[key],
        weight,
        similarity,
        points: Math.round(weight * similarity),
        positive: texts[key].positive,
        negative: texts[key].negative,
      };
    });

    const total = totalWeight(this.weights) || 100;
    const weighted = factors.reduce((sum, f) => sum + f.weight * f.similarity, 0);
    const score = Math.min(100, Math.max(0, Math.round((weighted / total) * 100)));

    const matches = factors
      .filter((f) => f.similarity >= MATCH_HIGHLIGHT_MIN && f.weight > 0)
      .sort((x, y) => y.weight * y.similarity - x.weight * x.similarity)
      .slice(0, 2)
      .map((f) => f.positive);

    const weakest = factors
      .filter((f) => f.similarity <= DIFF_HIGHLIGHT_MAX && f.weight > 0)
      .sort((x, y) => x.similarity * x.weight - y.similarity * y.weight)[0];

    return {
      score,
      factors,
      matches,
      difference: weakest?.negative ?? null,
      explanation: SCORE_EXPLANATION,
    };
  }
}

function buildTexts(
  a: MatchCandidate,
  b: MatchCandidate,
): Record<FactorKey, { positive: string; negative: string }> {
  return {
    budget: {
      positive: 'Büdcəniz üst-üstə düşür',
      negative: 'Büdcə aralığınız az kəsişir',
    },
    location: {
      positive:
        a.districtIds.some((id) => b.districtIds.includes(id))
          ? 'Eyni rayonlara baxırsınız'
          : 'Eyni şəhərdə axtarırsınız',
      negative: 'Fərqli yerlərə baxırsınız',
    },
    university: {
      positive:
        a.universityId && a.universityId === b.universityId
          ? 'Eyni universitetdə oxuyursunuz'
          : 'Universitet baxımından uyğunsunuz',
      negative: 'Fərqli universitetlərdə oxuyursunuz',
    },
    lifestyle: {
      positive:
        a.lifestyle === b.lifestyle && a.lifestyle === Lifestyle.SAKIT
          ? 'Hər ikiniz sakit həyat tərzi seçirsiniz'
          : 'Həyat tərziniz uyğun gəlir',
      negative: 'Həyat tərziniz fərqlidir — biri sakit, digəri sosial',
    },
    smoking: {
      positive:
        a.smoking === SmokingHabit.CEKMIREM && b.smoking === SmokingHabit.CEKMIREM
          ? 'Hər ikiniz siqaret çəkmirsiniz'
          : 'Siqaretə münasibətiniz uzlaşır',
      negative: 'Siqaretə münasibətiniz fərqlidir',
    },
    pets: {
      positive: 'Ev heyvanı məsələsində razılaşırsınız',
      negative: 'Ev heyvanı məsələsində razılaşmaq lazımdır',
    },
    genderAndRoom: {
      positive: 'Otaq və cins gözləntiləriniz uyğundur',
      negative: 'Otaq və cins gözləntiləriniz fərqlidir',
    },
  };
}

/** Qısa yazılış — çağıran kodun scorer yaratmasına ehtiyac qalmasın. */
export function computeCompatibility(
  viewer: MatchCandidate,
  other: MatchCandidate,
  weights: MatchingWeights,
): MatchResult {
  return new WeightedMatchScorer(weights).score(viewer, other);
}
