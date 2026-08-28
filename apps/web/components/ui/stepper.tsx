'use client';

import { Check } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Button } from './button';
import { ProgressBar } from './progress';

/**
 * Çoxaddımlı forma göstəricisi.
 *
 * İKİ görünüşü var və seçim ADDIM SAYINA görə edilir, ekran ölçüsünə görə yox:
 *
 *   · qısa axın (≤ 5 addım) → hər addımın adı ilə üfüqi zəncir
 *   · uzun axın (> 5 addım) → nömrəli dairələr + yalnız CARİ addımın adı
 *
 * Səbəb: doqquz addımın adını bir sətirdə yan-yana yazmaq mümkün deyil.
 * `truncate` da xilas etmir — "Cins üstünlüyü" iki hərfə düşür və zəncir
 * oxunmaz hərf yığınına çevrilir. Uzun axında istifadəçiyə lazım olan şey
 * bütün adlar deyil, "neçəncidəyəm və indi nə soruşulur" cavabıdır.
 *
 * Mobil hər iki halda eynidir: irəliləyiş zolağı + cari addımın adı.
 */

/** Bu həddən sonra adlı zəncir oxunmaz olur. */
const MAX_LABELLED_STEPS = 5;

export interface Step {
  id: string;
  label: string;
}

export interface StepperProps {
  steps: readonly Step[];
  /** 0-dan başlayan cari addım indeksi. */
  current: number;
  className?: string;
}

export function Stepper({ steps, current, className }: StepperProps) {
  const safeCurrent = Math.min(Math.max(current, 0), steps.length - 1);
  const currentStep = steps[safeCurrent];
  const compact = steps.length > MAX_LABELLED_STEPS;

  return (
    <div className={className}>
      {/* Mobil — və uzun axında desktop da eyni başlığı görür. */}
      <div className={compact ? undefined : 'sm:hidden'}>
        <ProgressBar
          value={safeCurrent + 1}
          max={steps.length}
          label={`Addım ${safeCurrent + 1} / ${steps.length}`}
        />
        {currentStep && (
          <p className="mt-2 text-h3 text-stone-900">{currentStep.label}</p>
        )}
      </div>

      {compact ? (
        <ol
          className="mt-3 hidden flex-wrap items-center gap-1.5 sm:flex"
          aria-label="Formanın addımları"
        >
          {steps.map((step, index) => {
            const done = index < safeCurrent;
            const active = index === safeCurrent;

            return (
              <li key={step.id}>
                <span
                  aria-current={active ? 'step' : undefined}
                  // Ad `title`-dadır: siçanla üstünə gələndə görünür, amma
                  // sətirdə yer tutmur.
                  title={step.label}
                  className={cn(
                    'grid size-7 place-items-center rounded-full text-sm font-bold transition-colors',
                    done && 'bg-sprout-500 text-white',
                    active && 'bg-forest-600 text-white',
                    !done && !active && 'bg-stone-200 text-stone-500',
                  )}
                >
                  {done ? <Check className="size-4" aria-hidden /> : index + 1}
                  <span className="sr-only">
                    {step.label}{' '}
                    {done ? '(tamamlanıb)' : active ? '(cari addım)' : '(qalıb)'}
                  </span>
                </span>
              </li>
            );
          })}
        </ol>
      ) : (
      <ol className="hidden items-center gap-2 sm:flex" aria-label="Formanın addımları">
        {steps.map((step, index) => {
          const done = index < safeCurrent;
          const active = index === safeCurrent;

          return (
            <li key={step.id} className="flex min-w-0 flex-1 items-center gap-2 last:flex-none">
              <span
                className="flex items-center gap-2"
                aria-current={active ? 'step' : undefined}
              >
                <span
                  aria-hidden
                  className={cn(
                    'grid size-7 shrink-0 place-items-center rounded-full text-sm font-bold transition-colors',
                    done && 'bg-sprout-500 text-white',
                    active && 'bg-forest-600 text-white',
                    !done && !active && 'bg-stone-200 text-stone-500',
                  )}
                >
                  {done ? <Check className="size-4" /> : index + 1}
                </span>
                <span
                  className={cn(
                    'truncate text-sm',
                    active ? 'font-semibold text-stone-900' : 'text-stone-500',
                  )}
                >
                  {step.label}
                </span>
                <span className="sr-only">
                  {done ? '(tamamlanıb)' : active ? '(cari addım)' : '(qalıb)'}
                </span>
              </span>

              {index < steps.length - 1 && (
                <span
                  aria-hidden
                  className={cn(
                    'h-px min-w-4 flex-1 transition-colors',
                    done ? 'bg-sprout-400' : 'bg-stone-200',
                  )}
                />
              )}
            </li>
          );
        })}
      </ol>
      )}
    </div>
  );
}

/**
 * Addım naviqasiyası.
 *
 * Mobil-də düymələr tam enli və aşağıda yapışqandır — uzun formada istifadəçi
 * "İrəli" düyməsini axtarmamalıdır.
 */
export function StepperActions({
  onBack,
  onNext,
  nextLabel = 'Davam et',
  backLabel = 'Geri',
  submitLabel = 'Tamamla',
  nextDisabled,
  loading,
  isLast,
  sticky = true,
  children,
}: {
  onBack?: () => void;
  onNext?: () => void;
  nextLabel?: string;
  backLabel?: string;
  /** Son addımdakı düymənin yazısı — redaktədə "Tamamla" yanlış səslənir. */
  submitLabel?: string;
  nextDisabled?: boolean;
  loading?: boolean;
  isLast?: boolean;
  sticky?: boolean;
  children?: ReactNode;
}) {
  return (
    <div
      className={cn(
        'flex flex-col-reverse gap-2 border-t border-stone-200/70 bg-white pt-4 sm:flex-row sm:justify-end',
        sticky && 'sticky bottom-0 z-10 pb-4 sm:static sm:pb-0',
      )}
    >
      {children}
      {onBack && (
        <Button type="button" variant="tertiary" onClick={onBack} fullWidth className="sm:w-auto">
          {backLabel}
        </Button>
      )}
      <Button
        type={onNext ? 'button' : 'submit'}
        onClick={onNext}
        disabled={nextDisabled}
        loading={loading}
        fullWidth
        className="sm:w-auto"
      >
        {isLast ? submitLabel : nextLabel}
      </Button>
    </div>
  );
}
