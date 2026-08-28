'use client';

import { Eye, EyeOff, Lock } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/**
 * Profil sətri: etiket, dəyər və görünürlük açarı.
 *
 * Açar sahənin öz sətrindədir — istifadəçi hansı məlumatın kimə göründüyünü
 * ayrıca "məxfilik" səhifəsində axtarmır. Onboardingdə (C1) toplanan eyni
 * bayraqlar buradan da dəyişdirilə bilir.
 *
 * `locked` sahələr (şəhər) gizlədilə bilmir: axtarış və uyğunluq onsuz işləmir.
 * Bunu gizlətmək əvəzinə səbəbi ilə birlikdə açıq göstərilir.
 */
export function FieldRow({
  label,
  value,
  isPublic,
  onTogglePrivacy,
  locked,
  lockedReason,
  pending,
  className,
}: {
  label: string;
  value: ReactNode;
  isPublic?: boolean;
  onTogglePrivacy?: (next: boolean) => void;
  locked?: boolean;
  lockedReason?: string;
  pending?: boolean;
  className?: string;
}) {
  const empty = value === null || value === undefined || value === '';

  return (
    <div
      className={cn(
        'flex flex-col gap-2 py-3.5 sm:flex-row sm:items-center sm:gap-4',
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="text-2xs font-semibold uppercase tracking-wider text-stone-500">
          {label}
        </p>
        <p
          className={cn(
            'mt-0.5 text-body',
            empty ? 'italic text-stone-400' : 'text-stone-900',
          )}
        >
          {empty ? 'Doldurulmayıb' : value}
        </p>
      </div>

      {locked ? (
        <span
          className="flex shrink-0 items-center gap-1.5 text-2xs text-stone-500"
          title={lockedReason}
        >
          <Lock className="size-3.5" aria-hidden />
          Həmişə görünür
        </span>
      ) : onTogglePrivacy ? (
        <button
          type="button"
          role="switch"
          aria-checked={Boolean(isPublic)}
          disabled={pending}
          onClick={() => onTogglePrivacy(!isPublic)}
          className={cn(
            'flex shrink-0 items-center gap-2 rounded-[var(--radius-chip)] border px-3 py-1.5 text-2xs font-semibold transition-colors',
            'disabled:cursor-wait disabled:opacity-60',
            isPublic
              ? 'border-sprout-300 bg-sprout-50 text-forest-700 hover:bg-sprout-100'
              : 'border-stone-300 bg-white text-stone-600 hover:border-stone-400',
          )}
        >
          {isPublic ? (
            <Eye className="size-3.5" aria-hidden />
          ) : (
            <EyeOff className="size-3.5" aria-hidden />
          )}
          {isPublic ? 'Görünür' : 'Gizli'}
        </button>
      ) : null}
    </div>
  );
}
