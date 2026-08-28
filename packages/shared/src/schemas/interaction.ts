/**
 * Favorit, şikayət, bildiriş və moderasiya sxemləri.
 */

import { z } from 'zod';
import { REPORT } from '../constants';
import { ReportReason, ReportStatus, ReportTarget, values } from '../enums';
import { listingReportReasons, userReportReasons } from '../labels';
import { idSchema } from './common';

/**
 * Şikayət — iki hədəf üçün: elan və istifadəçi/profil.
 *
 * Profil şikayəti ayrıca lazımdır: otaq yoldaşı təhlükəsizliyində problem
 * çox vaxt elanda deyil, şəxsin davranışındadır və yalnız elan şikayəti
 * bunu tutmur.
 */
export const createReportSchema = z
  .object({
    targetType: z.enum(values(ReportTarget), { required_error: 'Hədəf seçilməyib' }),
    targetId: idSchema,
    reason: z.enum(values(ReportReason), { required_error: 'Səbəbi seçin' }),
    comment: z.string().trim().max(REPORT.COMMENT_MAX, 'Çox uzundur').optional(),
  })
  .refine((d) => d.reason !== ReportReason.DIGER || !!d.comment?.trim(), {
    message: '"Digər" seçəndə səbəbi qısaca yazın',
    path: ['comment'],
  })
  .refine(
    (d) =>
      d.targetType === ReportTarget.LISTING
        ? listingReportReasons.includes(d.reason)
        : userReportReasons.includes(d.reason),
    { message: 'Bu səbəb seçilmiş hədəfə uyğun deyil', path: ['reason'] },
  );
export type CreateReportInput = z.infer<typeof createReportSchema>;

export const resolveReportSchema = z.object({
  status: z.enum([ReportStatus.REVIEWING, ReportStatus.RESOLVED, ReportStatus.DISMISSED]),
  resolutionNote: z.string().trim().max(REPORT.COMMENT_MAX).optional(),
});
export type ResolveReportInput = z.infer<typeof resolveReportSchema>;

/** Elan moderasiyası (Prompt G). Rədd edəndə səbəb məcburidir — istifadəçiyə göstərilir. */
export const moderationDecisionSchema = z
  .object({
    action: z.enum(['APPROVE', 'REJECT', 'SUSPEND']),
    reason: z.string().trim().max(500).optional(),
  })
  .refine((d) => d.action === 'APPROVE' || !!d.reason?.trim(), {
    message: 'Səbəbi yazın — istifadəçiyə göstəriləcək',
    path: ['reason'],
  });
export type ModerationDecisionInput = z.infer<typeof moderationDecisionSchema>;

/*
  TƏLƏBƏ VƏ EV SAHİBİ TƏSDİQİ ÇIXARILIB.

  Əvvəl burada `verificationRequestSchema` və `verificationDecisionSchema`
  vardı. Hər iki təsdiq admin tərəfindən əl ilə verilirdi və uzaqdan etibarlı
  yoxlanıla bilmirdi — göndərilən sənəd şəkli onu göndərənə aid olduğunu sübut
  etmir. Səhv verilə bilən nişan istifadəçidə yanlış etibar yaradır.

  Telefon təsdiqi qalır (OTP ilə avtomatik) və ayrıca sxem tələb etmir.
*/

// ---------------------------------------------------------------------------
// Moderasiya növbəsi (Prompt G2 bunu genişləndirəcək)
// ---------------------------------------------------------------------------

export const reportQuerySchema = z.object({
  status: z.enum(values(ReportStatus)).optional(),
  targetType: z.enum(values(ReportTarget)).optional(),
});
export type ReportQuery = z.infer<typeof reportQuerySchema>;

export interface ReportDto {
  id: string;
  targetType: ReportTarget;
  targetId: string;
  /** Hədəfin adı — moderator id-yə baxmasın deyə birlikdə gəlir. */
  targetLabel: string | null;
  /** Elan şikayətlərində detal səhifəsinə keçid. */
  targetSlug: string | null;
  reason: ReportReason;
  comment: string | null;
  status: ReportStatus;
  reporter: { id: string; fullName: string };
  resolutionNote: string | null;
  createdAt: string;
  resolvedAt: string | null;
}
