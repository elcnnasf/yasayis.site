/**
 * Uyğunluq formulunun çəkiləri.
 *
 * BURADA SABİT RƏQƏM YOXDUR — bu dəyərlər yalnız ilkin konfiqurasiyadır.
 * İşlək sistemdə çəkilər `matching_weights` cədvəlindən oxunur və admin
 * tərəfindən dəyişdirilə bilər; sətir yoxdursa, aşağıdakılar işlədilir.
 *
 * Cəmi 100 olmalıdır — `assertWeightsValid` bunu yoxlayır.
 */

export const FACTOR_KEYS = [
  'budget',
  'location',
  'university',
  'lifestyle',
  'smoking',
  'pets',
  'genderAndRoom',
] as const;

export type FactorKey = (typeof FACTOR_KEYS)[number];

export type MatchingWeights = Record<FactorKey, number>;

/** İlkin çəkilər — məhsul qərarı, texniki sabit deyil. */
export const DEFAULT_WEIGHTS: MatchingWeights = {
  budget: 25,
  location: 20,
  university: 15,
  lifestyle: 15,
  smoking: 10,
  pets: 5,
  genderAndRoom: 10,
};

export const FACTOR_LABELS: Record<FactorKey, string> = {
  budget: 'Büdcə uyğunluğu',
  location: 'Şəhər və rayon',
  university: 'Universitet',
  lifestyle: 'Yaşayış tərzi',
  smoking: 'Siqaret',
  pets: 'Heyvanlara münasibət',
  genderAndRoom: 'Otaq və cins üstünlüyü',
};

/** İstifadəçiyə göstərilən sabit izah. */
export const SCORE_EXPLANATION =
  'Bu uyğunluq sizin profilinizdə qeyd etdiyiniz seçimlərə əsasən hesablanıb.';

/** Bu həddən yuxarı skor "yaxşı uyğunluq" kimi vurğulanır. */
export const GOOD_MATCH_THRESHOLD = 70;

/** İzahda "uyğun gəlir" kimi göstərilən minimal oxşarlıq. */
export const MATCH_HIGHLIGHT_MIN = 0.8;

/** İzahda "fərqlənir" kimi göstərilən maksimal oxşarlıq. */
export const DIFF_HIGHLIGHT_MAX = 0.5;

export function totalWeight(weights: MatchingWeights): number {
  return FACTOR_KEYS.reduce((sum, key) => sum + (weights[key] ?? 0), 0);
}

/**
 * Çəkilərin etibarlılığını yoxlayır.
 * Admin panelindən dəyişiklik ediləndə cəmin 100 qalması məcburidir —
 * əks halda "91% uyğun" rəqəmi mənasını itirir.
 */
export function assertWeightsValid(weights: MatchingWeights): void {
  for (const key of FACTOR_KEYS) {
    const value = weights[key];
    if (!Number.isInteger(value) || value < 0 || value > 100) {
      throw new Error(`"${FACTOR_LABELS[key]}" çəkisi 0–100 arası tam ədəd olmalıdır`);
    }
  }
  const total = totalWeight(weights);
  if (total !== 100) {
    throw new Error(`Çəkilərin cəmi 100 olmalıdır, hazırda ${total}`);
  }
}

/** Naməlum mənbədən gələn çəkiləri ilkin dəyərlərlə tamamlayır. */
export function normalizeWeights(partial: Partial<MatchingWeights> | null): MatchingWeights {
  return { ...DEFAULT_WEIGHTS, ...(partial ?? {}) };
}
