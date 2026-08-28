import { describe, expect, it } from 'vitest';
import {
  GenderPreference,
  Lifestyle,
  PetsAttitude,
  SmokingHabit,
} from '../enums';
import {
  computeCompatibility,
  passesHardFilters,
  type MatchCandidate,
} from './score';
import { DEFAULT_WEIGHTS, GOOD_MATCH_THRESHOLD, normalizeWeights } from './weights';

/**
 * Uyğunluq formulunun testləri.
 *
 * NİYƏ MƏHZ BU MODUL
 * Uyğunluq faizi platformanın əsas fərqləndiricisidir və eyni zamanda yeganə
 * yerdir ki, səhv GÖRÜNMÜR: 91 əvəzinə 62 çıxsa, ekranda hər şey normal
 * görünür — sadəcə istifadəçiyə yanlış adam təklif olunur. Belə səhvi ancaq
 * test tutur.
 *
 * Testlər KONKRET RƏQƏMƏ bağlanmır (çəkilər admin tərəfindən dəyişdirilə
 * bilir), MÜNASİBƏTLƏRİ yoxlayır: eyni profil özündən yüksək, ziddiyyətli
 * profil aşağı bal almalıdır. Belə testlər çəki dəyişəndə səbəbsiz sınmır,
 * amma formul pozulanda dərhal tutur.
 */

const BAKU = 'city-baku';
const GENJE = 'city-genje';

function candidate(overrides: Partial<MatchCandidate> = {}): MatchCandidate {
  return {
    userId: 'user-a',
    gender: 'QADIN',
    genderPreference: null,
    cityId: BAKU,
    districtIds: ['d-narimanov'],
    universityId: 'uni-bdu',
    lifestyle: Lifestyle.SAKIT,
    smoking: SmokingHabit.CEKMIREM,
    petsAttitude: PetsAttitude.PROBLEM_DEYIL,
    budgetMin: 25_000,
    budgetMax: 30_000,
    roomCount: 2,
    ...overrides,
  };
}

describe('passesHardFilters', () => {
  it('istifadəçini özü ilə uyğunlaşdırmır', () => {
    const me = candidate({ userId: 'same' });
    expect(passesHardFilters(me, candidate({ userId: 'same' }))).toBe(false);
  });

  it('fərqli şəhərdəki namizədi siyahıdan çıxarır', () => {
    const viewer = candidate({ cityId: BAKU });
    const other = candidate({ userId: 'user-b', cityId: GENJE });
    expect(passesHardFilters(viewer, other)).toBe(false);
  });

  it('şəhəri seçilməmiş namizədi çıxarmır', () => {
    const viewer = candidate({ cityId: BAKU });
    const other = candidate({ userId: 'user-b', cityId: null });
    expect(passesHardFilters(viewer, other)).toBe(true);
  });

  it('cins üstünlüyünü hər iki tərəf üçün tətbiq edir', () => {
    const viewer = candidate({
      userId: 'v',
      gender: 'QADIN',
      genderPreference: GenderPreference.QADIN,
    });
    const kisi = candidate({ userId: 'o', gender: 'KISI', genderPreference: null });
    expect(passesHardFilters(viewer, kisi)).toBe(false);

    // Qarşı tərəfin üstünlüyü də nəzərə alınır: baxan uyğun gəlsə belə,
    // namizəd yalnız kişi axtarırsa uyğunluq yoxdur.
    const neytral = candidate({ userId: 'v2', gender: 'QADIN', genderPreference: null });
    const yalnizKisiAxtaran = candidate({
      userId: 'o2',
      gender: 'QADIN',
      genderPreference: GenderPreference.KISI,
    });
    expect(passesHardFilters(neytral, yalnizKisiAxtaran)).toBe(false);
  });
});

describe('computeCompatibility', () => {
  const score = (a: MatchCandidate, b: MatchCandidate) =>
    computeCompatibility(a, b, DEFAULT_WEIGHTS).score;

  it('skoru 0–100 aralığında tam ədəd verir', () => {
    const result = computeCompatibility(
      candidate(),
      candidate({ userId: 'user-b' }),
      DEFAULT_WEIGHTS,
    );
    expect(Number.isInteger(result.score)).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it('tam eyni profillərə yüksək bal verir', () => {
    expect(score(candidate(), candidate({ userId: 'user-b' }))).toBeGreaterThanOrEqual(
      GOOD_MATCH_THRESHOLD,
    );
  });

  it('hər şeyi zidd olan profilə eyni profildən aşağı bal verir', () => {
    const eyni = score(candidate(), candidate({ userId: 'user-b' }));
    const zidd = score(
      candidate(),
      candidate({
        userId: 'user-b',
        districtIds: ['d-xetai'],
        universityId: 'uni-aztu',
        lifestyle: Lifestyle.SOSIAL,
        smoking: SmokingHabit.CEKIREM,
        petsAttitude: PetsAttitude.ISTEMIREM,
        budgetMin: 60_000,
        budgetMax: 80_000,
        roomCount: 5,
      }),
    );
    expect(zidd).toBeLessThan(eyni);
  });

  it('kəsişməyən büdcə skoru aşağı salır', () => {
    const kesisen = score(
      candidate({ budgetMin: 25_000, budgetMax: 35_000 }),
      candidate({ userId: 'b', budgetMin: 28_000, budgetMax: 32_000 }),
    );
    const kesismeyen = score(
      candidate({ budgetMin: 25_000, budgetMax: 35_000 }),
      candidate({ userId: 'b', budgetMin: 70_000, budgetMax: 90_000 }),
    );
    expect(kesismeyen).toBeLessThan(kesisen);
  });

  it('məlumatı olmayan profili cəzalandırmır, amma tam bal da vermir', () => {
    const bos = candidate({
      userId: 'b',
      lifestyle: null,
      smoking: null,
      petsAttitude: null,
      budgetMin: null,
      budgetMax: null,
      universityId: null,
    });
    const natamam = score(candidate(), bos);
    const tam = score(candidate(), candidate({ userId: 'b' }));

    expect(natamam).toBeGreaterThan(0);
    expect(natamam).toBeLessThan(tam);
  });

  it('skor simmetrikdir — kimin kimə baxdığı nəticəni dəyişmir', () => {
    const a = candidate({ userId: 'a' });
    const b = candidate({
      userId: 'b',
      lifestyle: Lifestyle.SOSIAL,
      budgetMin: 20_000,
      budgetMax: 40_000,
    });
    expect(score(a, b)).toBe(score(b, a));
  });

  it('rəqəmi həmişə izahla birlikdə qaytarır', () => {
    // Layihənin qaydası: "qara qutu skor" qadağandır.
    const result = computeCompatibility(
      candidate(),
      candidate({ userId: 'b' }),
      DEFAULT_WEIGHTS,
    );
    expect(result.explanation.length).toBeGreaterThan(0);
    expect(result.factors.length).toBeGreaterThan(0);
    expect(result.matches.length).toBeGreaterThan(0);
  });
});

describe('normalizeWeights', () => {
  it('boş dəyər üçün standart çəkiləri qaytarır', () => {
    expect(normalizeWeights(null)).toEqual(DEFAULT_WEIGHTS);
  });

  it('yarımçıq çəki obyektini standartlarla tamamlayır', () => {
    const result = normalizeWeights({ budget: 40 });
    expect(result.budget).toBe(40);
    // Verilməyən amillər itmir.
    expect(Object.keys(result).sort()).toEqual(Object.keys(DEFAULT_WEIGHTS).sort());
  });
});
