'use client';

import { useEffect, useState } from 'react';
import { BellPlus, House, Plus } from 'lucide-react';
import type { ListingSummaryDto, PagedResult } from '@yasayis/shared';
import { api } from '@/lib/api-client';
import { EmptyState } from '@/components/empty/empty-state';
import { ListingCard } from '@/components/listing/listing-card';
import { ButtonLink } from '@/components/ui/button';
import { ListingCardSkeleton } from '@/components/ui/card';
import { SectionHeading } from './section-heading';

/**
 * "Sənə uyğun evlər" — ana səhifədəki elan bölməsi.
 *
 * YALNIZ REAL ELANLAR. Burada nümunə (demo) elan GÖSTƏRİLMİR və bu, şüurlu
 * qərardır: uydurma elan — "Nümunə" nişanı ilə belə — ziyarətçiyə mövcud
 * olmayan mənzil göstərir, o isə kliklə açıb tapa bilmir. Boş rəf dürüstdür,
 * yalan rəf isə etibarı bir dəfəyə itirir.
 *
 * Elan yoxdursa boş vəziyyət göstərilir və orada iki irəli yol var: axtarış
 * bildirişi yaratmaq və ya özü elan yerləşdirmək.
 *
 * Sıralama `yeni`-dir: yeni dərc olunan hər elan avtomatik olaraq bu bölmənin
 * başına düşür — moderasiya gözlənilmədiyi üçün dərhal.
 */

const CARD_COUNT = 4;

export function PropertySection() {
  const [listings, setListings] = useState<ListingSummaryDto[] | null>(null);

  useEffect(() => {
    let cancelled = false;

    api
      .get<PagedResult<ListingSummaryDto>>('/listings', {
        sort: 'yeni',
        limit: CARD_COUNT,
      })
      .then((res) => {
        if (!cancelled) setListings(res.items);
      })
      .catch(() => {
        // Sorğu alınmadısa da uydurma elan göstərmirik — boş vəziyyət dürüstdür.
        if (!cancelled) setListings([]);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="section-tight mx-auto max-w-7xl px-4 sm:px-6">
      <SectionHeading
        icon={House}
        title="Sənə uyğun evlər"
        note="Büdcənə və axtardığın əraziyə uyğun yaşayış variantları."
        moreHref="/axtaris"
      />

      {listings !== null && listings.length === 0 ? (
        <EmptyState
          className="mt-5"
          title="Hazırda bu ərazidə elan yoxdur."
          description="Axtarış bildirişi yarat və yeni elan əlavə olunanda xəbərdar ol."
          actions={
            <>
              <ButtonLink href="/panel/axtaris-bildirisleri">
                <BellPlus className="size-4" aria-hidden />
                Axtarış bildirişi yarat
              </ButtonLink>
              <ButtonLink href="/elan/yeni" variant="tertiary">
                <Plus className="size-4" aria-hidden />
                Elan yerləşdir
              </ButtonLink>
            </>
          }
        />
      ) : (
        <CardGrid>
          {listings === null
            ? Array.from({ length: CARD_COUNT }).map((_, i) => (
                <ListingCardSkeleton key={i} />
              ))
            : listings.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
        </CardGrid>
      )}
    </section>
  );
}

/**
 * Kart şəbəkəsi.
 *
 * Mobil-də üfüqi sürüşdürmə: kartları bir-birinin altına yığmaq ekranı
 * lazımsız uzadır və növbəti bölməni gözdən itirir. `snap` sinifləri sürüşməni
 * kartın kənarında dayandırır ki, yarımçıq kart qalmasın.
 *
 * Kart eni mobildə 13rem-dir (əvvəl 17rem idi): 17rem-də ekranda cəmi bir kart
 * sığırdı və bölmə "tək elan var" kimi oxunurdu. 13rem-də ikinci kartın kənarı
 * görünür, bu da sürüşdürüləsi olduğunu deyir. `sm:w-auto` toxunulmayıb —
 * desktopda şəbəkə eynidir.
 *
 * Desktopda dörd sütun: bir tam sıra dolur və səhifə uzanmır. Daha çox kart
 * göstərmək ana səhifəni siyahı səhifəsinə çevirir — burada məqsəd elanları
 * saymaq deyil, onların necə göründüyünü göstərib axtarışa keçirtməkdir.
 */
function CardGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-5">
      <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:pb-0 xl:grid-cols-4">
        {Array.isArray(children)
          ? children.map((child, i) => (
              <div key={i} className="w-[13rem] shrink-0 snap-start sm:w-auto">
                {child}
              </div>
            ))
          : children}
      </div>
    </div>
  );
}
