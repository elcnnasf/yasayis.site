/**
 * Taksonomiya sxemləri  (PROMPT A2)
 *
 * City / District / University / Major — kodda sabitlənmir, admin panelindən
 * idarə olunur. Oxuma hamıya açıqdır, yazma yalnız admin rolu ilə mümkündür.
 *
 * Bu sxemlər üç yerdə işlənir: onboarding (C1), axtarış filtrləri (D4), admin panel (G2).
 */

import { z } from 'zod';
import { idSchema, slugSchema } from './common';

const nameFields = {
  name: z.string().trim().min(2, 'Ad çox qısadır').max(180, 'Ad çox uzundur'),
  nameRu: z.string().trim().max(180).nullish(),
};

const listingFields = {
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().min(0).max(9999).default(0),
};

// --- Yazma sxemləri (yalnız admin) ----------------------------------------

export const cityInputSchema = z.object({
  ...nameFields,
  slug: slugSchema,
  ...listingFields,
});
export type CityInput = z.infer<typeof cityInputSchema>;

export const districtInputSchema = z.object({
  cityId: idSchema,
  ...nameFields,
  slug: slugSchema,
  ...listingFields,
});
export type DistrictInput = z.infer<typeof districtInputSchema>;

export const universityInputSchema = z.object({
  /** "Digər" qeydində null olur — heç bir şəhərə bağlı deyil. */
  cityId: idSchema.nullish(),
  ...nameFields,
  shortName: z.string().trim().max(24).nullish(),
  slug: slugSchema,
  ...listingFields,
});
export type UniversityInput = z.infer<typeof universityInputSchema>;

export const majorInputSchema = z.object({
  ...nameFields,
  slug: slugSchema,
  ...listingFields,
});
export type MajorInput = z.infer<typeof majorInputSchema>;

/** Redaktədə bütün sahələr istəyə bağlıdır. */
export const cityUpdateSchema = cityInputSchema.partial();
export const districtUpdateSchema = districtInputSchema.partial();
export const universityUpdateSchema = universityInputSchema.partial();
export const majorUpdateSchema = majorInputSchema.partial();

// --- Oxuma parametrləri ----------------------------------------------------

export const taxonomyListQuerySchema = z.object({
  cityId: idSchema.optional(),
  /** Admin panel deaktiv qeydləri də görməlidir. */
  includeInactive: z.coerce.boolean().default(false),
  q: z.string().trim().min(1).max(80).optional(),
});
export type TaxonomyListQuery = z.infer<typeof taxonomyListQuerySchema>;

// --- Cavab tipləri ---------------------------------------------------------

export interface CityDto {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  sortOrder: number;
  districtCount?: number;
}

export interface DistrictDto {
  id: string;
  cityId: string;
  name: string;
  slug: string;
  isActive: boolean;
  sortOrder: number;
}

export interface UniversityDto {
  id: string;
  cityId: string | null;
  name: string;
  shortName: string | null;
  slug: string;
  isOther: boolean;
  isActive: boolean;
  sortOrder: number;
}

export interface MajorDto {
  id: string;
  name: string;
  slug: string;
  isOther: boolean;
  isActive: boolean;
  sortOrder: number;
}
