/**
 * Admin panel — KPI-lar, konversiya hunisi və idarəetmə əməliyyatları.
 */

import { z } from 'zod';
import { ListingStatus, UserStatus, values } from '../enums';
import { idSchema, pageQuerySchema } from './common';

// ---------------------------------------------------------------------------
// KPI-lar
// ---------------------------------------------------------------------------

export interface AdminMetricsDto {
  users: { total: number; students: number; owners: number; suspended: number };
  listings: {
    active: number;
    pending: number;
    rejected: number;
    expired: number;
    suspended: number;
    deleted: number;
    reported: number;
  };
  roommates: { profiles: number; visible: number; matches: number; accepted: number };
  activity: { searches: number; favorites: number; contacts: number };
  reports: { open: number; reviewing: number; resolved: number };
  /** Hesabat dövrü — bütün "activity" rəqəmləri buna aiddir. */
  period: { days: number; from: string; to: string };
}

/**
 * Konversiya hunisi.
 *
 * Son addım avtomatik ölçülə bilmir (ödəniş və chat yoxdur), ona görə
 * "nəticənin bildirilməsi" istifadəçinin özündən soruşulur.
 */
export interface FunnelDto {
  steps: {
    key: 'registered' | 'profileCompleted' | 'searched' | 'contacted' | 'reported';
    label: string;
    /** Bu addıma çatan İSTİFADƏÇİ sayı (hadisə sayı deyil). */
    count: number;
    /** Əvvəlki addıma nisbətdə faiz. */
    conversionFromPrevious: number;
    /** Birinci addıma nisbətdə faiz. */
    conversionFromStart: number;
  }[];
  /** Sorğuya cavab verənlərin nəticə bölgüsü. */
  outcomes: { found: number; stillLooking: number; noReply: number };
  /** "Uğurlu yaşayış bağlantısı" — cavab verənlər arasında "tapdım" faizi. */
  successRate: number;
}

export const adminPeriodSchema = z.object({
  /** Neçə günlük dövr — aktivlik metrikləri buna görə hesablanır. */
  days: z.coerce.number().int().min(1).max(365).default(30),
});
export type AdminPeriodQuery = z.infer<typeof adminPeriodSchema>;

// ---------------------------------------------------------------------------
// Nəticə sorğusu (pulse)
// ---------------------------------------------------------------------------

export const SURVEY_OUTCOMES = {
  TAPDIM: 'TAPDIM',
  HELE_AXTARIRAM: 'HELE_AXTARIRAM',
  CAVAB_ALMADIM: 'CAVAB_ALMADIM',
} as const;
export type SurveyOutcome = (typeof SURVEY_OUTCOMES)[keyof typeof SURVEY_OUTCOMES];

export const surveyOutcomeLabels: Record<SurveyOutcome, string> = {
  TAPDIM: 'Tapdım',
  HELE_AXTARIRAM: 'Hələ axtarıram',
  CAVAB_ALMADIM: 'Cavab almadım',
};

export const answerSurveySchema = z.object({
  outcome: z.enum(values(SURVEY_OUTCOMES)),
});
export type AnswerSurveyInput = z.infer<typeof answerSurveySchema>;

export interface PendingSurveyDto {
  id: string;
  /** Nə barədə soruşulur — elan başlığı və ya şəxsin adı. */
  subject: string;
  /** Elan əlaqəsidirsə detal səhifəsinə keçid. */
  listingSlug: string | null;
  contactedAt: string;
}

// ---------------------------------------------------------------------------
// İdarəetmə əməliyyatları
// ---------------------------------------------------------------------------

export const adminUsersQuerySchema = pageQuerySchema.extend({
  q: z.string().trim().min(2).max(80).optional(),
  status: z.enum(values(UserStatus)).optional(),
  role: z.enum(['STUDENT', 'OWNER', 'ADMIN']).optional(),
});
export type AdminUsersQuery = z.infer<typeof adminUsersQuerySchema>;

export const suspendUserSchema = z
  .object({
    suspend: z.boolean(),
    reason: z.string().trim().max(500).optional(),
  })
  .refine((d) => !d.suspend || !!d.reason?.trim(), {
    message: 'Bloklama səbəbini yazın — audit jurnalına düşəcək',
    path: ['reason'],
  });
export type SuspendUserInput = z.infer<typeof suspendUserSchema>;

export const adminListingsQuerySchema = pageQuerySchema.extend({
  status: z.enum(values(ListingStatus)).optional(),
  q: z.string().trim().min(2).max(80).optional(),
});
export type AdminListingsQuery = z.infer<typeof adminListingsQuerySchema>;

export const deleteListingSchema = z.object({
  reason: z.string().trim().min(3, 'Səbəbi yazın').max(500),
});
export type DeleteListingInput = z.infer<typeof deleteListingSchema>;

export interface AdminUserDto {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  isStudent: boolean;
  isOwner: boolean;
  isAdmin: boolean;
  status: UserStatus;
  phoneVerified: boolean;
  listingCount: number;
  reportCount: number;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface AdminListingRowDto {
  id: string;
  slug: string;
  title: string;
  status: ListingStatus;
  cityName: string;
  price: number;
  ownerName: string;
  ownerId: string;
  imageCount: number;
  reportCount: number;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Audit jurnalı
// ---------------------------------------------------------------------------

export const auditQuerySchema = pageQuerySchema.extend({
  actorId: idSchema.optional(),
  entityType: z.string().trim().max(40).optional(),
  entityId: idSchema.optional(),
});
export type AuditQuery = z.infer<typeof auditQuerySchema>;

export interface AuditEntryDto {
  id: string;
  action: string;
  actionLabel: string;
  entityType: string;
  entityId: string;
  actor: { id: string; fullName: string } | null;
  meta: Record<string, unknown> | null;
  createdAt: string;
}

/** Audit əməliyyatlarının insan dilində adları. */
export const auditActionLabels: Record<string, string> = {
  'listing.approve': 'Elanı təsdiqlədi',
  'listing.reject': 'Elanı rədd etdi',
  'listing.suspend': 'Elanı dayandırdı',
  'listing.reactivate': 'Elanı yenidən aktivləşdirdi',
  'listing.delete': 'Elanı sildi',
  'user.suspend': 'İstifadəçini blokladı',
  'user.unsuspend': 'İstifadəçinin blokunu açdı',
  'report.resolve': 'Şikayəti həll etdi',
  'report.dismiss': 'Şikayəti rədd etdi',
  'report.review': 'Şikayəti baxışa götürdü',
  'verification.approve': 'Təsdiqi verdi',
  'verification.reject': 'Təsdiqi rədd etdi',
  'taxonomy.create': 'Taksonomiyaya əlavə etdi',
  'taxonomy.update': 'Taksonomiyanı dəyişdi',
  'taxonomy.delete': 'Taksonomiyadan sildi',
  'matching.weights': 'Uyğunluq çəkilərini dəyişdi',
};
