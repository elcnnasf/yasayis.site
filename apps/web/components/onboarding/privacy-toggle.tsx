'use client';

import { Eye, EyeOff } from 'lucide-react';
import { useId } from 'react';
import { cn } from '@/lib/cn';

/**
 * Sahə görünürlüyü açarı.
 *
 * Hər onboarding addımının öz ekranında dayanır — ayrıca "məxfilik" səhifəsində
 * deyil. Səbəb: istifadəçi cavabı yazdığı anda onun kimə görünəcəyini bilməlidir,
 * sonradan axtarıb tapmamalıdır.
 *
 * Həssas sahələrdə (dəqiq büdcə rəqəmi, cins üstünlüyü) ilkin dəyər BAĞLIDIR.
 */
export function PrivacyToggle({
  checked,
  onChange,
  publicLabel = 'Profilimdə görünsün',
  privateLabel = 'Yalnız mənə görünsün',
  note,
  className,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  publicLabel?: string;
  privateLabel?: string;
  note?: string;
  className?: string;
}) {
  const id = useId();
  const Icon = checked ? Eye : EyeOff;

  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-[var(--radius-input)] ring-1 ring-stone-200/70 bg-stone-50 p-3.5',
        className,
      )}
    >
      <Icon
        aria-hidden
        className={cn('mt-0.5 size-4 shrink-0', checked ? 'text-forest-600' : 'text-stone-500')}
      />

      <div className="min-w-0 flex-1">
        <label htmlFor={id} className="cursor-pointer text-sm font-medium text-stone-800">
          {checked ? publicLabel : privateLabel}
        </label>
        {note && <p className="mt-0.5 text-2xs leading-relaxed text-stone-500">{note}</p>}
      </div>

      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative h-6 w-11 shrink-0 rounded-full transition-colors',
          checked ? 'bg-forest-600' : 'bg-stone-300',
        )}
      >
        <span className="sr-only">{checked ? publicLabel : privateLabel}</span>
        <span
          aria-hidden
          className={cn(
            'absolute top-0.5 size-5 rounded-full bg-white shadow-sm transition-[left]',
            checked ? 'left-[1.375rem]' : 'left-0.5',
          )}
        />
      </button>
    </div>
  );
}
