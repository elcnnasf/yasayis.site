/**
 * Saxlanılanlar  (PROMPT F1)
 *
 * Bir mexanizm iki növ hədəfi saxlayır: elan və otaq yoldaşı profili.
 * `targetType` + `targetId` polimorfik açardır (bax: A1 sxemi) — bütövlük
 * service təbəqəsində yoxlanılır.
 */

import { z } from 'zod';
import { FavoriteTarget, values } from '../enums';
import { idSchema, pageQuerySchema } from './common';
import type { ListingSummaryDto } from './listing';
import type { RoommateCardDto } from './roommate';

export const favoriteSchema = z.object({
  targetType: z.enum(values(FavoriteTarget)),
  targetId: idSchema,
});
export type FavoriteInput = z.infer<typeof favoriteSchema>;

export const favoritesQuerySchema = pageQuerySchema.extend({
  targetType: z.enum(values(FavoriteTarget)).optional(),
});
export type FavoritesQuery = z.infer<typeof favoritesQuerySchema>;

/**
 * Saxlanılanlar səhifəsi iki bölmədən ibarətdir, ona görə cavab da
 * ayrılmış gəlir — client tərəfdə süzgəcdən keçirməyə ehtiyac qalmır.
 */
export interface FavoritesDto {
  listings: ListingSummaryDto[];
  roommates: RoommateCardDto[];
  counts: { listings: number; roommates: number };
}

/** Kartlarda ürək düyməsinin vəziyyətini bilmək üçün. */
export interface FavoriteIdsDto {
  listingIds: string[];
  roommateUserIds: string[];
}
