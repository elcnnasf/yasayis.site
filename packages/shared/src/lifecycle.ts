/**
 * Elan həyat dövrü.
 *
 *   (yaradılır) ──▶ ACTIVE ──30 gün──▶ EXPIRED
 *                     │  ▲                │
 *                     │  └──sahibi uzadır─┘
 *                     │
 *                     └──admin dayandırır──▶ SUSPENDED ──admin açır──▶ ACTIVE
 *                                                │
 *                                                └──admin rədd edir──▶ REJECTED
 *
 * MODERASİYA ÖNCƏDƏN DEYİL, SONRADANDIR.
 *
 * Elan yaradılan kimi `ACTIVE` olur — moderator təsdiqi gözlənilmir. Səbəb:
 * ilk mərhələdə elan sayı azdır və hər elanı bir iş günü növbədə saxlamaq
 * platformanı ev sahibi üçün yararsız edir; tələbə isə boş axtarış nəticəsi
 * görür. Nəzarət ARADAN QALXMIR, yerini dəyişir: şikayət və admin paneli
 * üzərindən elan istənilən vaxt dayandırıla (`SUSPENDED`) və ya silinə bilər.
 *
 * `PENDING` statusu sxemdə qalır — köhnə sətirlər üçün və gələcəkdə moderasiya
 * yenidən açılarsa deyə. Yeni elan bu statusa DÜŞMÜR.
 *
 * Sahibi istənilən vaxt "Elan artıq aktual deyil" deyə bilər → `EXPIRED`.
 */

import { z } from 'zod';
import { ListingStatus } from './enums';

/** Axtarışda və ictimai siyahılarda yalnız bu status görünür. */
export const PUBLIC_STATUSES: readonly ListingStatus[] = [ListingStatus.ACTIVE];

/** Sahibi bu statusları özü təyin edə bilər. */
export const OWNER_SETTABLE: readonly ListingStatus[] = [ListingStatus.EXPIRED];

/**
 * Hansı statusdan hansına keçmək olar.
 * Keçid burada yoxdursa, service onu rədd edir — statuslar arasında
 * "təsadüfi" keçid mümkün deyil.
 */
export const ALLOWED_TRANSITIONS: Record<ListingStatus, readonly ListingStatus[]> = {
  // Köhnə `PENDING` sətirləri üçün saxlanılır — yeni elan bura düşmür.
  [ListingStatus.PENDING]: [
    ListingStatus.ACTIVE,
    ListingStatus.REJECTED,
    ListingStatus.EXPIRED,
  ],
  [ListingStatus.ACTIVE]: [ListingStatus.EXPIRED, ListingStatus.SUSPENDED],
  // Rədd edilən elan düzəldilib yenidən dərc oluna bilər.
  [ListingStatus.REJECTED]: [ListingStatus.ACTIVE],
  // Müddəti bitən elanı sahibi bir kliklə yenidən dərc edir — moderasiya yoxdur.
  [ListingStatus.EXPIRED]: [ListingStatus.ACTIVE],
  [ListingStatus.SUSPENDED]: [ListingStatus.ACTIVE, ListingStatus.REJECTED],
};

export function canTransition(from: ListingStatus, to: ListingStatus): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

/** Sahibinə göstərilən izah — status niyə belədir və indi nə etmək olar. */
export const statusExplanations: Record<ListingStatus, string> = {
  [ListingStatus.PENDING]: 'Yoxlanılır.',
  [ListingStatus.ACTIVE]: 'Elan axtarışda görünür.',
  [ListingStatus.REJECTED]:
    'Elan qaydalara uyğun olmadığı üçün dayandırılıb. Səbəbi oxuyub düzəliş edin və yenidən dərc edin.',
  [ListingStatus.EXPIRED]:
    'Elanın müddəti bitib və ya siz onu deaktiv etmisiniz. Bir kliklə yenidən dərc edə bilərsiniz.',
  [ListingStatus.SUSPENDED]:
    'Elan admin tərəfindən dayandırılıb. Dəstəklə əlaqə saxlayın.',
};

// --- Sxemlər ---------------------------------------------------------------

/** Sahibi: "Elan artıq aktual deyil". */
export const expireListingSchema = z.object({
  /** İsteğe bağlı: nə üçün (statistika üçün, istifadəçiyə göstərilmir). */
  reason: z.enum(['KIRAYE_VERILDI', 'FIKIRDEN_DASINDIM', 'DIGER']).optional(),
});
export type ExpireListingInput = z.infer<typeof expireListingSchema>;

export const expireReasonLabels: Record<
  NonNullable<ExpireListingInput['reason']>,
  string
> = {
  KIRAYE_VERILDI: 'Kirayə verildi',
  FIKIRDEN_DASINDIM: 'Fikrimi dəyişdim',
  DIGER: 'Digər səbəb',
};

/** Admin moderasiya qərarı (Prompt G2 bunu genişləndirəcək). */
export const moderateListingSchema = z
  .object({
    action: z.enum(['APPROVE', 'REJECT', 'SUSPEND', 'REACTIVATE']),
    reason: z.string().trim().max(500).optional(),
  })
  .refine((d) => d.action === 'APPROVE' || d.action === 'REACTIVATE' || !!d.reason?.trim(), {
    message: 'Səbəbi yazın — elan sahibinə göstəriləcək',
    path: ['reason'],
  });
export type ModerateListingInput = z.infer<typeof moderateListingSchema>;
