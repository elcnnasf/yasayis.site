/**
 * Axtarış və filtr sxemləri.
 *
 * Bütün dəyərlər query string-dən gəlir, ona görə `coerce` və vergüllə ayrılmış
 * massivlər işlənir. Şəhər/rayon/universitet id-ləri taksonomiya API-dan gəlir —
 * burada heç bir siyahı sabitlənmir.
 */

import { z } from 'zod';
import { Amenity, GenderPreference, values } from '../enums';
import { csvArray, idSchema, pageQuerySchema, paginationQuerySchema } from './common';

export const SORT_OPTIONS = {
  /** Universitet seçilibsə ona yaxınlıq, yoxsa yenilik. */
  RELEVANT: 'uygun',
  CHEAPEST: 'ucuz',
  NEWEST: 'yeni',
  MOST_VIEWED: 'baxis',
} as const;
export type SortOption = (typeof SORT_OPTIONS)[keyof typeof SORT_OPTIONS];

export const sortLabels: Record<SortOption, string> = {
  [SORT_OPTIONS.RELEVANT]: 'Ən uyğun',
  [SORT_OPTIONS.CHEAPEST]: 'Ən ucuz',
  [SORT_OPTIONS.NEWEST]: 'Ən yeni',
  [SORT_OPTIONS.MOST_VIEWED]: 'Ən çox baxılan',
};

/** Elan sahibinin tipi — şəxs, yoxsa vasitəçi/agentlik. */
export const OWNER_TYPES = { PERSON: 'sexs', AGENCY: 'vasitechi' } as const;
export type OwnerType = (typeof OWNER_TYPES)[keyof typeof OWNER_TYPES];

export const ownerTypeLabels: Record<OwnerType, string> = {
  [OWNER_TYPES.PERSON]: 'Ev sahibi',
  [OWNER_TYPES.AGENCY]: 'Vasitəçi',
};

export const searchListingsQuerySchema = pageQuerySchema.extend({
  /** Sərbəst mətn: şəhər, rayon, universitet adı və ya elan başlığı. */
  q: z.string().trim().min(2).max(100).optional(),

  cityId: idSchema.optional(),
  districtId: csvArray(idSchema),
  /**
   * Universitet seçiləndə həmin universitetə yaxınlıq göstərilmiş elanlar
   * önə çıxır (D3-dəki dəqiqə etiketlərinə görə). Dəqiq coğrafi routing
   * gələcək mərhələyə saxlanılıb.
   */
  universityId: idSchema.optional(),

  priceMin: z.coerce.number().int().min(0).optional(),
  priceMax: z.coerce.number().int().min(0).optional(),
  roomCount: csvArray(z.coerce.number().int().min(1).max(10)),
  hasVacantRoom: z.coerce.boolean().optional(),

  forStudents: z.coerce.boolean().optional(),
  forWomen: z.coerce.boolean().optional(),
  forMen: z.coerce.boolean().optional(),

  petsAllowed: z.coerce.boolean().optional(),
  /** true = siqaret çəkmək olar (balkonda da daxil). */
  smokingAllowed: z.coerce.boolean().optional(),

  /** Mebel, Wi-Fi, metroya yaxınlıq və digər imkanlar. */
  amenity: csvArray(z.enum(values(Amenity))),

  /** true = depozit tələb olunmur. */
  noDeposit: z.coerce.boolean().optional(),
  utilitiesIncluded: z.coerce.boolean().optional(),

  ownerType: z.enum([OWNER_TYPES.PERSON, OWNER_TYPES.AGENCY]).optional(),

  sort: z
    .enum([
      SORT_OPTIONS.RELEVANT,
      SORT_OPTIONS.CHEAPEST,
      SORT_OPTIONS.NEWEST,
      SORT_OPTIONS.MOST_VIEWED,
    ])
    .default(SORT_OPTIONS.RELEVANT),
});
export type SearchListingsQuery = z.infer<typeof searchListingsQuerySchema>;

/** Ana səhifədəki sürətli axtarış — yalnız dörd sahə. */
export const quickSearchSchema = z.object({
  q: z.string().trim().max(100).optional(),
  cityId: idSchema.optional(),
  districtId: idSchema.optional(),
  universityId: idSchema.optional(),
  priceMax: z.coerce.number().int().min(0).optional(),
});
export type QuickSearchInput = z.infer<typeof quickSearchSchema>;

/** Otaq yoldaşı axtarışı — uyğunluq skoru ilə sıralanır. */
export const searchRoommatesQuerySchema = paginationQuerySchema.extend({
  cityId: idSchema.optional(),
  universityId: idSchema.optional(),
  budgetMin: z.coerce.number().int().min(0).optional(),
  budgetMax: z.coerce.number().int().min(0).optional(),
  genderPreference: z.enum(values(GenderPreference)).optional(),
  minScore: z.coerce.number().int().min(0).max(100).optional(),
  sort: z
    .enum([SORT_OPTIONS.RELEVANT, SORT_OPTIONS.NEWEST])
    .default(SORT_OPTIONS.RELEVANT),
});
export type SearchRoommatesQuery = z.infer<typeof searchRoommatesQuerySchema>;

/** Saxlanmış axtarış — yeni uyğun elan çıxanda bildiriş göndərilir. */
export const searchAlertSchema = z
  .object({
    name: z.string().trim().max(120).nullish(),
    cityId: idSchema.nullish(),
    districtId: idSchema.nullish(),
    universityId: idSchema.nullish(),
    priceMin: z.number().int().min(0).nullish(),
    priceMax: z.number().int().min(0).nullish(),
    roomCount: z.number().int().min(1).max(10).nullish(),
    studentOnly: z.boolean().default(false),
  })
  .refine((d) => d.priceMin == null || d.priceMax == null || d.priceMin <= d.priceMax, {
    message: 'Minimum qiymət maksimumdan böyük ola bilməz',
    path: ['priceMax'],
  });
export type SearchAlertInput = z.infer<typeof searchAlertSchema>;
