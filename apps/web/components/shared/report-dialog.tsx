'use client';

import { useState } from 'react';
import { Flag } from 'lucide-react';
import {
  listingReportReasons,
  ReportReason,
  reportReasonLabels,
  ReportTarget,
  userReportReasons,
} from '@yasayis/shared';
import { api, ApiRequestError } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Well } from '@/components/ui/card';
import { Field, Select, Textarea } from '@/components/ui/field';

/**
 * Şikayət formu  (PROMPT F3)
 *
 * Eyni komponent həm elan, həm istifadəçi üçün işlənir — fərq yalnız səbəb
 * siyahısındadır. İki ayrı forma yazmaq mətnlərin vaxtla ayrılmasına gətirərdi.
 */
export function ReportDialog({
  targetType,
  targetId,
  targetLabel,
  onClose,
}: {
  targetType: ReportTarget;
  targetId: string;
  targetLabel?: string;
  onClose: () => void;
}) {
  const reasons =
    targetType === ReportTarget.LISTING ? listingReportReasons : userReportReasons;

  const [reason, setReason] = useState<ReportReason>(reasons[0] ?? ReportReason.SAXTA_ELAN);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (sent) {
    return (
      <Well className="text-sm text-stone-700">
        Şikayətiniz moderasiya növbəsinə düşdü. Nəticə barədə bildiriş alacaqsınız.
      </Well>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (reason === ReportReason.DIGER && !comment.trim()) {
      setError('"Digər" seçəndə səbəbi qısaca yazın');
      return;
    }

    setBusy(true);
    setError(null);

    try {
      await api.post('/reports', {
        targetType,
        targetId,
        reason,
        comment: comment.trim() || undefined,
      });
      setSent(true);
    } catch (err) {
      setError(
        err instanceof ApiRequestError && err.status === 401
          ? 'Şikayət göndərmək üçün daxil olun.'
          : err instanceof ApiRequestError
            ? err.message
            : 'Göndərilmədi. Bir azdan yenidən cəhd edin.',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-3 rounded-[var(--radius-input)] ring-1 ring-stone-200/70 p-4"
    >
      <p className="flex items-center gap-2 text-sm font-semibold text-stone-800">
        <Flag className="size-4 shrink-0 text-stone-500" aria-hidden />
        {targetType === ReportTarget.LISTING ? 'Elanı şikayət et' : 'Profili şikayət et'}
      </p>

      {targetLabel && (
        <p className="truncate text-2xs text-stone-500">Hədəf: {targetLabel}</p>
      )}

      <Field label="Səbəb" required>
        {(p) => (
          <Select
            value={reason}
            onChange={(e) => setReason(e.target.value as ReportReason)}
            {...p}
          >
            {reasons.map((r) => (
              <option key={r} value={r}>
                {reportReasonLabels[r]}
              </option>
            ))}
          </Select>
        )}
      </Field>

      <Field
        label="Şərh"
        hint="Qısa izah moderatorun işini sürətləndirir."
        error={error ?? undefined}
      >
        {(p) => (
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value.slice(0, 500))}
            className="min-h-20"
            {...p}
          />
        )}
      </Field>

      <div className="flex gap-2">
        <Button type="submit" size="sm" loading={busy}>
          Göndər
        </Button>
        <Button type="button" size="sm" variant="tertiary" onClick={onClose}>
          Ləğv et
        </Button>
      </div>
    </form>
  );
}

/** Şikayət düyməsi + formu — açılıb-bağlanma məntiqi bir yerdə. */
export function ReportButton({
  targetType,
  targetId,
  targetLabel,
  label,
}: {
  targetType: ReportTarget;
  targetId: string;
  targetLabel?: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);

  if (open) {
    return (
      <ReportDialog
        targetType={targetType}
        targetId={targetId}
        targetLabel={targetLabel}
        onClose={() => setOpen(false)}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="inline-flex items-center justify-center gap-1.5 py-2 text-sm text-stone-500 underline-offset-4 hover:text-danger-600 hover:underline"
    >
      <Flag className="size-3.5" aria-hidden />
      {label ??
        (targetType === ReportTarget.LISTING ? 'Elanı şikayət et' : 'Profili şikayət et')}
    </button>
  );
}
