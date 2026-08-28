import { Handshake, ListChecks, Search } from 'lucide-react';
import { HOW_IT_WORKS } from '@yasayis/shared';

/**
 * "3 addımda yeni yaşayışını tap."
 *
 * Kart deyil: bu bölmə seçim tələb etmir, sadəcə izah edir. Üç ağır kart onu
 * elan bölməsi qədər vacib göstərir və gözü yorur.
 *
 * Addımlar arasında NÖQTƏLİ xətt keçir, düz xətt yox — düz xətt "proses
 * diaqramı" kimi rəsmi oxunur, nöqtəli isə yüngül keçid hissi verir. Xətt
 * dekorativdir və ekran oxuyucudan gizlədilir; ardıcıllıq `<ol>` semantikası
 * ilə onsuz da ötürülür.
 */

/** İkonlar addımın öz mənasından gəlir, sıradan deyil. */
const STEP_ICONS = [Search, ListChecks, Handshake] as const;

export function HowItWorks() {
  return (
    <section className="section-tight mx-auto max-w-7xl px-4 sm:px-6">
      <h2 className="text-center text-h2 text-stone-900">
        3 addımda yeni yaşayışını tap.
      </h2>

      <ol className="mt-8 grid gap-8 md:grid-cols-3 md:gap-4">
        {HOW_IT_WORKS.map((step, index) => {
          const Icon = STEP_ICONS[index] ?? Search;
          const isLast = index === HOW_IT_WORKS.length - 1;

          return (
            <li key={step.step} className="relative flex items-start gap-4">
              {/* Növbəti addıma gedən nöqtəli xətt — yalnız desktopda, çünki
                  mobil-də addımlar alt-alta düzülür və ox mənasını itirir. */}
              {!isLast && (
                <span
                  aria-hidden
                  className="absolute left-[3.75rem] right-2 top-7 hidden border-t-2 border-dotted border-stone-300 md:block"
                />
              )}

              <span
                aria-hidden
                className="grid size-14 shrink-0 place-items-center rounded-full bg-forest-800 text-sprout-300"
              >
                <Icon className="size-6" strokeWidth={1.8} />
              </span>

              <div className="min-w-0 pt-1">
                <div className="flex items-baseline gap-2.5">
                  <span
                    aria-hidden
                    className="tabular text-body font-bold text-sprout-600"
                  >
                    {String(step.step).padStart(2, '0')}
                  </span>
                  <h3 className="text-h3 text-stone-900">{step.title}</h3>
                </div>

                <p className="mt-1.5 max-w-[15rem] text-sm leading-relaxed text-stone-600">
                  {step.description}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
