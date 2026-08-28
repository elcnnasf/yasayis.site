import Link from 'next/link';
import { Search, Users } from 'lucide-react';
import { FINAL_CTA } from '@yasayis/shared';

/**
 * Səhifənin sonundakı yekun çağırış.
 *
 * Yuxarıdakı hero ilə EYNİ iki yol təkrarlanır — "axtarmağa başla" və "otaq
 * yoldaşı tap". Aşağıya çatan istifadəçi artıq bölmələri oxuyub; ona üçüncü
 * yeni seçim vermək qərarı çətinləşdirir, eyni iki qapını təkrar açmaq isə
 * asanlaşdırır.
 *
 * Yerləşdirmə mərkəzi deyil, üfüqidir: mətn solda, düymələr sağda. Mərkəzi
 * variant "kampaniya afişası" kimi oxunur və səhifənin qalanındakı sol
 * düzləndirmə ritmini pozur.
 */
export function FinalCTA() {
  return (
    <section className="section-tight mx-auto max-w-7xl px-4 sm:px-6">
      <div className="ink relative overflow-hidden rounded-[var(--radius-panel)] px-6 py-10 sm:px-10 sm:py-12">
        <Skyline />

        <div className="relative flex flex-col gap-7 lg:flex-row lg:items-center lg:justify-between lg:gap-10">
          <div className="max-w-lg">
            <h2 className="text-balance text-h1 text-white">{FINAL_CTA.headline}</h2>
            <p className="mt-3 text-pretty text-body leading-relaxed text-stone-300">
              {FINAL_CTA.subheadline}
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row lg:shrink-0">
            <Link
              href="/axtaris"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-[var(--radius-input)] bg-sprout-500 px-6 text-body font-semibold text-forest-900 transition-colors hover:bg-sprout-400 active:bg-sprout-600"
            >
              <Search className="size-4" strokeWidth={2.2} aria-hidden />
              {FINAL_CTA.primaryCta}
            </Link>

            {/* İkinci düymə şəffafdır: eyni doyğunluqda iki düymə yan-yana
                duranda istifadəçi hansının əsas olduğunu anlamır. */}
            <Link
              href="/otaq-yoldasi"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-[var(--radius-input)] px-6 text-body font-semibold text-white ring-1 ring-white/25 transition-colors hover:bg-white/10 active:bg-white/15"
            >
              <Users className="size-4" strokeWidth={2.2} aria-hidden />
              {FINAL_CTA.secondaryCta}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * Sağ kənardakı şəhər siluetı — dekorativ.
 *
 * Şəkil deyil, SVG: bir neçə düzbucaqdan ibarətdir, ona görə ayrıca fayl və
 * yüklənmə gözləməsi lazım gəlmir. Çox solğundur — fon olaraq qalır, mətnlə
 * yarışmır. Ekran oxuyucudan gizlədilir, çünki heç bir məlumat daşımır.
 */
function Skyline() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 320 120"
      preserveAspectRatio="xMaxYMax slice"
      className="pointer-events-none absolute bottom-0 right-0 hidden h-full w-[22rem] text-white/[0.07] lg:block"
      fill="currentColor"
    >
      <rect x="10" y="62" width="34" height="58" rx="2" />
      <rect x="52" y="40" width="28" height="80" rx="2" />
      <rect x="88" y="74" width="24" height="46" rx="2" />
      <rect x="120" y="26" width="32" height="94" rx="2" />
      <rect x="160" y="56" width="26" height="64" rx="2" />
      <rect x="194" y="82" width="30" height="38" rx="2" />
      <rect x="232" y="46" width="28" height="74" rx="2" />
      <rect x="268" y="68" width="34" height="52" rx="2" />
    </svg>
  );
}
