import Link from 'next/link';
import { ArrowRight, House, Tag, Users } from 'lucide-react';
import { HERO } from '@yasayis/shared';
import { ProductPreview } from './product-preview';

/**
 * Ana səhifənin hero bölməsi — TÜND səth.
 *
 * Başlıqda son söz vurğu rəngindədir: "daha uyğun **yaşayış.**" Rəng brendin
 * adını cümlənin içində işarələyir, ona görə ayrıca "biz kimik" sətri lazım
 * gəlmir. Vurğu YALNIZ bir sözdədir — iki-üç rəngli söz başlığı bayram
 * afişasına çevirir.
 *
 * İki CTA var, üç yox. "Elan yerləşdir" düymə deyil, düymələrin altındakı
 * bir sətir mətn linkidir: ana səhifəyə gələnin böyük əksəriyyəti yaşayış
 * axtaran tələbədir, ev sahibi isə azlıqdır — onu görməzdən gəlmirik, amma
 * əsas axının yanında bərabər çəkidə göstərmirik.
 *
 * Sağdakı önizləmə dekorativ illüstrasiya deyil, məhsulun özüdür —
 * baxın: `product-preview.tsx`.
 */
export function Hero() {
  // Vurğu son sözə düşür. Mətn `marketing.ts`-dən gəldiyi üçün burada
  // bölünür — mesaj bir mənbədə qalsın, forma isə səhifəyə aid olsun.
  const words = HERO.headline.trim().split(' ');
  const lastWord = words.pop() ?? '';
  const leadWords = words.join(' ');

  return (
    <section className="ink relative overflow-hidden">
      {/* Nöqtə toru yalnız sağ yarıda — mətn tərəfi təmiz qalır. */}
      <div
        aria-hidden
        className="dot-grid pointer-events-none absolute inset-y-0 right-0 hidden w-1/2 opacity-60 lg:block"
      />

      <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 pb-24 pt-12 sm:px-6 sm:pb-28 sm:pt-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-14 lg:pb-32">
        <div className="max-w-xl">
          <p className="inline-flex items-center rounded-[var(--radius-chip)] bg-white/[0.06] px-3.5 py-1.5 text-sm font-medium text-sprout-300 ring-1 ring-white/10">
            Tələbələr üçün xüsusi platforma
          </p>

          <h1 className="mt-6 text-display text-white">
            {leadWords}{' '}
            <span className="text-sprout-400">{lastWord}</span>
          </h1>

          <p className="mt-5 max-w-md text-lead text-stone-300">{HERO.subheadline}</p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/axtaris"
              className="inline-flex h-13 items-center justify-center gap-2.5 rounded-[var(--radius-input)] bg-sprout-600 px-7 text-lead font-semibold text-white shadow-[var(--shadow-pop)] transition-colors hover:bg-sprout-500 active:bg-sprout-700"
            >
              <House className="size-5" strokeWidth={2} aria-hidden />
              {HERO.primaryCta}
            </Link>

            <Link
              href="/otaq-yoldasi"
              className="inline-flex h-13 items-center justify-center gap-2.5 rounded-[var(--radius-input)] px-7 text-lead font-semibold text-white ring-1 ring-white/25 transition-colors hover:bg-white/10 active:bg-white/15"
            >
              <Users className="size-5" strokeWidth={2} aria-hidden />
              {HERO.secondaryCta}
            </Link>
          </div>

          {/* Ev sahibi üçün yol — düymə deyil, sətir. */}
          <p className="mt-6 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-stone-400">
            <Tag className="size-4 shrink-0" strokeWidth={1.8} aria-hidden />
            Elan yerləşdirmək istəyirsən?
            <Link
              href="/elan/yeni"
              className="inline-flex items-center gap-1 font-semibold text-sprout-400 transition-colors hover:text-sprout-300"
            >
              {HERO.tertiaryCta}
              <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          </p>
        </div>

        {/* Kiçik ekranda önizləmə mətni aşağı itələyir və axtarışı gizlədir. */}
        <div className="hidden md:block">
          <ProductPreview />
        </div>
      </div>
    </section>
  );
}
