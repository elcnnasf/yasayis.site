'use client';

import { ChevronDown } from 'lucide-react';
import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { cn } from '@/lib/cn';

/**
 * Form elementləri.
 *
 * Ortaq qaydalar:
 *   · Hündürlük 44px — mobil toxunma hədəfi.
 *   · Xəta mesajı sahənin altında və `aria-describedby` ilə bağlıdır.
 *   · Xəta varkən izah mətni gizlənmir, xəta onun yerinə keçir — ekranda
 *     iki oxşar sətir qalıb istifadəçini çaşdırmasın.
 */

// Sərhəd `ring` ilə verilir: fokusda qalınlıq dəyişəndə element yerindən
// tərpənmir (border eni layout-a təsir edir, ring etmir).
const controlBase =
  'w-full rounded-[var(--radius-input)] bg-white px-3.5 text-body text-stone-900 ' +
  'ring-1 transition-[box-shadow,background-color] outline-none ' +
  'placeholder:text-stone-400 ' +
  'disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-500 disabled:ring-stone-200';

const controlState = (invalid?: boolean) =>
  invalid
    ? 'ring-danger-500 focus:ring-2 focus:ring-danger-500'
    : 'ring-stone-200 hover:ring-stone-300 focus:ring-2 focus:ring-forest-600';

// ---------------------------------------------------------------------------
// Sahə çərçivəsi
// ---------------------------------------------------------------------------

export interface FieldProps {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  /** Sağ üstdə göstərilən sayğac və ya köməkçi mətn: "0/500" */
  aside?: ReactNode;
  children: (props: { id: string; invalid: boolean; 'aria-describedby'?: string }) => ReactNode;
}

export function Field({ label, hint, error, required, aside, children }: FieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = error ? errorId : hintId;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm font-semibold text-stone-800">
          {label}
          {required && (
            <span className="ml-0.5 text-danger-500" aria-hidden>
              *
            </span>
          )}
        </label>
        {aside && <span className="text-2xs text-stone-500">{aside}</span>}
      </div>

      {children({ id, invalid: Boolean(error), 'aria-describedby': describedBy })}

      {error ? (
        <p id={errorId} role="alert" className="text-sm text-danger-600">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-sm text-stone-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Mətn sahələri
// ---------------------------------------------------------------------------

export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean; prefix?: ReactNode }
>(function Input({ className, invalid, prefix, ...props }, ref) {
  if (!prefix) {
    return (
      <input
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(controlBase, controlState(invalid), 'h-11', className)}
        {...props}
      />
    );
  }

  /*
    Qiymət sahəsindəki "AZN" kimi sabit ön şəkilçi.

    Prefiks mütləq mövqedə DEYİL, adi flex elementidir. Səbəb: mütləq mövqe
    sahənin sol boşluğunu sabit rəqəmlə (`pl-9`) uyğunlaşdırmağı tələb edir və
    prefiks uzun olan kimi ("₼" → "AZN") yazı üst-üstə düşür. Flex-də prefiks
    öz enini özü tutur, uzunluğu nə olursa olsun.

    Çərçivə (`ring`) indi qutunun özündədir, input isə şəffafdır — fokus halqası
    bütöv sahənin ətrafında görünsün deyə `focus-within` işlənir.
  */
  return (
    <div
      className={cn(
        'flex h-11 w-full items-center gap-1.5 rounded-[var(--radius-input)] bg-white pl-3.5 pr-3.5',
        'ring-1 transition-[box-shadow,background-color]',
        invalid
          ? 'ring-danger-500 focus-within:ring-2 focus-within:ring-danger-500'
          : 'ring-stone-200 hover:ring-stone-300 focus-within:ring-2 focus-within:ring-forest-600',
        props.disabled && 'cursor-not-allowed bg-stone-100',
        className,
      )}
    >
      <span className="shrink-0 select-none text-body text-stone-500">{prefix}</span>
      <input
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(
          'min-w-0 flex-1 bg-transparent text-body text-stone-900 outline-none',
          'placeholder:text-stone-400 disabled:cursor-not-allowed disabled:text-stone-500',
        )}
        {...props}
      />
    </div>
  );
});

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }
>(function Textarea({ className, invalid, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        controlBase,
        controlState(invalid),
        'min-h-28 resize-y py-2.5 leading-relaxed',
        className,
      )}
      {...props}
    />
  );
});

export const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }
>(function Select({ className, invalid, children, ...props }, ref) {
  return (
    <div className="relative">
      <select
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(
          controlBase,
          controlState(invalid),
          'h-11 cursor-pointer appearance-none pr-10',
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-stone-500"
      />
    </div>
  );
});

// ---------------------------------------------------------------------------
// Seçim elementləri
// ---------------------------------------------------------------------------

export function Checkbox({
  label,
  description,
  error,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  /** ReactNode-dur, string yox: razılıq mətnində qaydalara link olur. */
  label: ReactNode;
  description?: string;
  error?: string;
}) {
  const id = useId();
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <div className="flex items-start gap-3">
        <input
          id={id}
          type="checkbox"
          aria-invalid={error ? true : undefined}
          aria-describedby={errorId}
          className="mt-0.5 size-5 shrink-0 cursor-pointer rounded-[0.35rem] border-stone-300 text-forest-600 accent-[var(--color-forest-600)]"
          {...props}
        />
        <label htmlFor={id} className="cursor-pointer select-none">
          <span className="block text-body text-stone-800">{label}</span>
          {description && (
            <span className="block text-sm text-stone-500">{description}</span>
          )}
        </label>
      </div>

      {error && (
        <p id={errorId} role="alert" className="text-sm text-danger-600">
          {error}
        </p>
      )}
    </div>
  );
}

export interface ChoiceOption<T extends string> {
  value: T;
  label: string;
  description?: string;
}

/**
 * Radio qrupu — kart görünüşündə.
 *
 * Onboarding və filtr panellərində açılan siyahıdan üstündür: bütün variantlar
 * eyni anda görünür, mobil ekranda barmaqla rahat seçilir.
 */
export function ChoiceGroup<T extends string>({
  name,
  legend,
  options,
  value,
  onChange,
  columns = 1,
  error,
  className,
}: {
  name: string;
  legend: string;
  options: readonly ChoiceOption<T>[];
  value?: T;
  onChange?: (value: T) => void;
  columns?: 1 | 2;
  error?: string;
  className?: string;
}) {
  return (
    <fieldset className={cn('flex flex-col gap-1.5', className)}>
      <legend className="mb-1.5 text-sm font-semibold text-stone-800">{legend}</legend>

      <div className={cn('grid gap-2', columns === 2 && 'sm:grid-cols-2')}>
        {options.map((option) => {
          const checked = value === option.value;
          return (
            <label
              key={option.value}
              className={cn(
                'flex cursor-pointer items-start gap-3 rounded-[var(--radius-input)] border p-3.5 transition-colors',
                checked
                  ? 'border-forest-600 bg-forest-50 shadow-[var(--shadow-xs)]'
                  : 'border-stone-200 bg-white hover:border-stone-300',
              )}
            >
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={checked}
                onChange={() => onChange?.(option.value)}
                className="mt-0.5 size-5 shrink-0 cursor-pointer accent-[var(--color-forest-600)]"
              />
              <span className="min-w-0">
                <span
                  className={cn(
                    'block text-body font-medium',
                    checked ? 'text-forest-700' : 'text-stone-800',
                  )}
                >
                  {option.label}
                </span>
                {option.description && (
                  <span className="block text-sm text-stone-500">{option.description}</span>
                )}
              </span>
            </label>
          );
        })}
      </div>

      {error && (
        <p role="alert" className="text-sm text-danger-600">
          {error}
        </p>
      )}
    </fieldset>
  );
}

/** Çoxseçimli filtr çipləri — imkanlar (Wi-Fi, Lift) və otaq sayı üçün. */
export function ChipGroup<T extends string>({
  legend,
  options,
  values,
  onToggle,
  className,
}: {
  legend: string;
  options: readonly { value: T; label: string }[];
  values: readonly T[];
  onToggle?: (value: T) => void;
  className?: string;
}) {
  return (
    <fieldset className={cn('flex flex-col gap-2.5', className)}>
      <legend className="text-sm font-semibold text-stone-800">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const checked = values.includes(option.value);
          return (
            <label
              key={option.value}
              className={cn(
                'cursor-pointer select-none rounded-[var(--radius-chip)] border px-3.5 py-2 text-sm font-medium transition-colors',
                checked
                  ? 'border-sprout-600 bg-sprout-600 text-white shadow-[var(--shadow-xs)]'
                  : 'border-stone-200 bg-white text-stone-700 hover:border-stone-300',
              )}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => onToggle?.(option.value)}
                className="sr-only"
              />
              {option.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
