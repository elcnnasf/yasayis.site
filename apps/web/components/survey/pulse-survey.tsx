'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import {
  SURVEY_OUTCOMES,
  surveyOutcomeLabels,
  type PendingSurveyDto,
  type SurveyOutcome,
} from '@yasayis/shared';
import { api } from '@/lib/api-client';
import { cn } from '@/lib/cn';

/**
 * "Nəticə necə oldu?" — yüngül pulse-sorğu  (PROMPT G1)
 *
 * Əlaqədən 3 gün sonra görünür. Bu, ödəniş və chat sistemi olmadan
 * "uğurlu yaşayış bağlantısı" KPI-nı ölçməyin yeganə yoludur.
 *
 * Dizayn qaydası: modal DEYİL. İstifadəçini dayandırıb cavab tələb etmək
 * cavab dərəcəsini qaldırır, amma məhsuldan uzaqlaşdırır. Ona görə aşağıda
 * kiçik zolaqdır, üç toxunuşla bitir və bağlana bilir.
 */
export function PulseSurvey() {
  const [survey, setSurvey] = useState<PendingSurveyDto | null>(null);
  const [busy, setBusy] = useState(false);
  const [thanks, setThanks] = useState(false);

  useEffect(() => {
    let cancelled = false;

    api
      .get<PendingSurveyDto[]>('/me/surveys')
      .then((list) => {
        // Eyni anda yalnız biri göstərilir — sorğu yığını istifadəçini yorur.
        if (!cancelled && list.length > 0) setSurvey(list[0] ?? null);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, []);

  if (!survey) return null;

  const answer = async (outcome: SurveyOutcome) => {
    setBusy(true);
    await api.post(`/me/surveys/${survey.id}`, { outcome }).catch(() => undefined);
    setThanks(true);
    setBusy(false);
    setTimeout(() => setSurvey(null), 2200);
  };

  const skip = async () => {
    await api.post(`/me/surveys/${survey.id}/skip`).catch(() => undefined);
    setSurvey(null);
  };

  return (
    <div
      role="region"
      aria-label="Nəticə sorğusu"
      className={cn(
        'fixed inset-x-3 bottom-20 z-30 mx-auto max-w-lg',
        'rounded-[var(--radius-panel)] bg-white ring-1 ring-stone-200/70 p-4',
        'shadow-[var(--shadow-pop)] lg:bottom-6',
      )}
    >
      {thanks ? (
        <p className="py-2 text-center text-body font-medium text-forest-700">
          Təşəkkür edirik — cavabınız platformanı yaxşılaşdırır.
        </p>
      ) : (
        <>
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-body font-semibold text-stone-900">Nəticə necə oldu?</p>
              <p className="mt-0.5 truncate text-sm text-stone-600">
                {survey.subject} ilə əlaqə saxlamışdınız.
              </p>
            </div>

            <button
              type="button"
              onClick={skip}
              aria-label="Bağla"
              className="grid size-8 shrink-0 place-items-center rounded-full text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {(Object.values(SURVEY_OUTCOMES) as SurveyOutcome[]).map((outcome) => (
              <button
                key={outcome}
                type="button"
                disabled={busy}
                onClick={() => answer(outcome)}
                className={cn(
                  'rounded-[var(--radius-input)] border px-3 py-2.5 text-sm font-semibold transition-colors',
                  'disabled:cursor-wait disabled:opacity-60',
                  outcome === SURVEY_OUTCOMES.TAPDIM
                    ? 'border-forest-600 bg-forest-600 text-white hover:bg-forest-700'
                    : 'border-stone-300 bg-white text-stone-700 hover:border-forest-500 hover:text-forest-700',
                )}
              >
                {surveyOutcomeLabels[outcome]}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
