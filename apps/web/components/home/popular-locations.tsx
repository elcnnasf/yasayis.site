'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Flame, MapPin } from 'lucide-react';
import { formatBudgetRange, type DistrictStatsDto } from '@yasayis/shared';
import { api } from '@/lib/api-client';
import { Skeleton } from '@/components/ui/card';

/**
 * "Tələbələrin ən çox axtardığı ərazilər".
 *
 * Qərar verə bilməyən istifadəçi üçün hazır giriş nöqtəsi: axtarış zolağını
 * doldurmaq əvəzinə bir toxunuşla nəticələrə keçir.
 *
 * Rayon siyahısı taksonomiyadan, qiymət aralığı isə AKTİV ELANLARDAN gəlir.
 * Rayonda hələ elan yoxdursa qiymət sətri göstərilmir — onun yerinə "Elanlara
 * bax" yazılır. Uydurma aralıq yazmaq marketplace-in etibarını ilk gündən
 * sıfırlayır və bu, layihənin açıq qaydasıdır.
 *
 * Sıralama: əvvəlcə elanı olan rayonlar (çoxdan aza), sonra boşlar. Beləliklə
 * baza dolduqca bölmə özü canlanır, kod dəyişmədən.
 */

/** Bakı ilk şəhərdir, çünki tələbə axını burada cəmlənib. */
const PRIMARY_CITY_SLUG = 'baki';
const MAX_CARDS = 6;

export function PopularLocations() {
  const [districts, setDistricts] = useState<DistrictStatsDto[] | null>(null);

  useEffect(() => {
    let cancelled = false;

    api
      .get<DistrictStatsDto[]>('/listings/district-stats', { citySlug: PRIMARY_CITY_SLUG })
      .then((list) => {
        if (!cancelled) setDistricts(list);
      })
      .catch(() => {
        // Sabit rayon siyahısı göstərmirik: kartlar boş səhifələrə aparardı.
        if (!cancelled) setDistricts([]);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const ranked = districts
    ? [...districts].sort((a, b) => b.activeListings - a.activeListings).slice(0, MAX_CARDS)
    : null;

  return (
    <section className="section-tight mx-auto max-w-7xl px-4 sm:px-6">
      <h2 className="flex items-center gap-2 text-h2 text-stone-900">
        <Flame className="size-5 shrink-0 text-sprout-600" strokeWidth={2} aria-hidden />
        Tələbələrin ən çox axtardığı ərazilər
      </h2>

      {/* Mobil-də üç sütun, desktopda altısı bir sırada — siyahı bir baxışda
          bitir və heç bir kart "davamı var" hissi yaratmır.

          Mobildə sütun eni ~1/3 ekrandır, ona görə kartın DAXİLİ də sıxılır
          (aşağıda `LocationCard`): ikon gizlənir və boşluqlar azalır, yoxsa
          rayon adı kəsilir. `sm:`-dən yuxarı heç nə dəyişmir. */}
      <ul className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-6">
        {ranked === null ? (
          Array.from({ length: MAX_CARDS }).map((_, i) => (
            <li key={i}>
              <Skeleton className="h-[4.5rem] w-full rounded-[var(--radius-input)]" />
            </li>
          ))
        ) : (
          ranked.map((district) => (
            <li key={district.districtId}>
              <LocationCard
                href={`/${district.citySlug}/${district.slug}`}
                name={district.name}
                caption={
                  district.priceMin !== null && district.priceMax !== null
                    ? formatBudgetRange(district.priceMin, district.priceMax)
                    : 'Elanlara bax'
                }
                tabular={district.priceMin !== null}
              />
            </li>
          ))
        )}
      </ul>
    </section>
  );
}

/**
 * Bir ərazi kartı.
 *
 * Bütöv kart klikləna biləndir — mobil-də kiçik mətn linkini tapmaq çətindir,
 * kartın özü isə rahat toxunma hədəfidir. Sağdakı ox kartın link olduğunu
 * rəngdən asılı olmadan bildirir.
 */
function LocationCard({
  href,
  name,
  caption,
  tabular,
}: {
  href: string;
  name: string;
  caption: string;
  tabular?: boolean;
}) {
  return (
    <Link
      href={href}
      className="group flex h-full items-center gap-1.5 rounded-[var(--radius-input)] bg-white p-2.5 ring-1 ring-stone-200 transition-shadow hover:shadow-[var(--shadow-card)] hover:ring-stone-300 sm:gap-2.5 sm:p-3.5"
    >
      {/* İkon yalnız `sm`-dən yuxarı: mobildə üç sütunda 16px ikon + boşluq
          mətnin yerini yeyir və rayon adı kəsilir. */}
      <MapPin
        className="hidden size-4 shrink-0 text-stone-400 transition-colors group-hover:text-sprout-600 sm:block"
        strokeWidth={1.9}
        aria-hidden
      />

      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-stone-900 sm:text-body">
          {name}
        </span>
        <span
          className={`${tabular ? 'tabular ' : ''}mt-0.5 block truncate text-2xs text-stone-500`}
        >
          {caption}
        </span>
      </span>

      <ChevronRight
        className="size-4 shrink-0 text-stone-300 transition-colors group-hover:text-stone-500"
        aria-hidden
      />
    </Link>
  );
}
