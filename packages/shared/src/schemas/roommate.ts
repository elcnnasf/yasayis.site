/**
 * Otaq yoldaşı kəşfi, uyğunlaşma və birgə axtarış.
 */

import { z } from 'zod';
import { PRICE } from '../constants';
import { Lifestyle, PetsAttitude, SmokingHabit } from '../enums';
import { idSchema } from './common';

// ---------------------------------------------------------------------------
// Kəşf
// ---------------------------------------------------------------------------

/** Otaq yoldaşı kartında göstərilən məlumat. */
export interface RoommateCardDto {
  userId: string;
  fullName: string;
  avatarUrl: string | null;
  universityName: string | null;
  universityShortName: string | null;
  majorName: string | null;
  cityName: string | null;
  /** Axtardığı rayonlar — boşdursa "bütün şəhər". */
  districtNames: string[];
  budgetMin: number | null;
  budgetMax: number | null;
  lifestyle: Lifestyle | null;
  smoking: SmokingHabit | null;
  petsAttitude: PetsAttitude | null;
  phoneVerified: boolean;
  studentVerified: boolean;
  /** 0–100. Giriş etməmiş və ya profili yarımçıq olanda null. */
  matchScore: number | null;
  /** Skorun ən güclü iki səbəbi. */
  matchReasons: string[];
  /** Bu istifadəçi ilə mövcud uyğunlaşmanın vəziyyəti. */
  matchStatus: 'NONE' | 'PENDING_SENT' | 'PENDING_RECEIVED' | 'ACCEPTED' | 'DECLINED';
}

/** Profil səhifəsindəki tam uyğunluq izahı. */
export interface MatchBreakdownDto {
  score: number;
  explanation: string;
  factors: {
    key: string;
    label: string;
    weight: number;
    points: number;
    similarity: number;
  }[];
  matches: string[];
  difference: string | null;
}

// ---------------------------------------------------------------------------
// Uyğunlaşma
// ---------------------------------------------------------------------------

export const requestMatchSchema = z.object({
  userId: idSchema,
  /** İstəyə bağlı qısa mesaj. */
  message: z.string().trim().max(300).optional(),
});
export type RequestMatchInput = z.infer<typeof requestMatchSchema>;

export const respondMatchSchema = z.object({
  accept: z.boolean(),
});
export type RespondMatchInput = z.infer<typeof respondMatchSchema>;

export interface RoommateMatchDto {
  id: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED';
  /** Qarşı tərəf — həmişə "mən olmayan" istifadəçi. */
  partner: {
    userId: string;
    fullName: string;
    avatarUrl: string | null;
    universityShortName: string | null;
  };
  scoreAtMatch: number | null;
  /** Təklifi mən göndərmişəmsə true. */
  initiatedByMe: boolean;
  createdAt: string;
  hasJointSearch: boolean;
}

// ---------------------------------------------------------------------------
// Birlikdə ev axtarışı
// ---------------------------------------------------------------------------

/**
 * Birgə axtarış profili.
 *
 * Büdcə default olaraq iki tərəfin büdcəsinin CƏMİdir (ikisi bir mənzil
 * kirayələyir), amma redaktə oluna bilər.
 */
export const jointSearchSchema = z
  .object({
    budgetMin: z.number().int().min(0).max(PRICE.MAX * 2),
    budgetMax: z.number().int().min(0).max(PRICE.MAX * 2),
    roomCount: z.number().int().min(1).max(10).default(2),
    districtIds: z.array(idSchema).max(10).default([]),
    studentsOnly: z.boolean().default(true),
  })
  .refine((d) => d.budgetMin <= d.budgetMax, {
    message: 'Minimum büdcə maksimumdan böyük ola bilməz',
    path: ['budgetMax'],
  });
export type JointSearchInput = z.infer<typeof jointSearchSchema>;

export interface JointSearchDto {
  id: string;
  matchId: string;
  /** "Elcan + Murad" */
  title: string;
  members: {
    userId: string;
    fullName: string;
    avatarUrl: string | null;
    budgetMin: number | null;
    budgetMax: number | null;
  }[];
  budgetMin: number;
  budgetMax: number;
  roomCount: number;
  districtIds: string[];
  districtNames: string[];
  cityId: string | null;
  cityName: string | null;
  studentsOnly: boolean;
  isActive: boolean;
}
