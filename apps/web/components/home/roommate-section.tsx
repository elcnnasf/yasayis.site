'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Users } from 'lucide-react';
import type { RoommateCardDto } from '@yasayis/shared';
import { api } from '@/lib/api-client';
import { RoommateCard } from '@/components/roommate/roommate-card';
import { Skeleton } from '@/components/ui/card';

/**
 * "Eyni evdə yaşayacağın insanı da seç" — platformanın ƏSAS fərqləndiricisi.
 *
 * Bölmə açıq yaşıl fonla verilir: səhifədəki yeganə rəngli sahədir və məhz
 * ona görə diqqət çəkir. Tünd fon sınandı və atıldı — səhifədə artıq iki tünd
 * sahə (başlıq və footer) var, üçüncüsü ritmi pozur və bölməni "başqa sayt"
 * kimi göstərirdi.
 *
 * Quruluş qəsdən iki hissəlidir: solda İDDİA, sağda ONUN SÜBUTU. İddianı
 * kartların üstündə başlıq kimi qoysaydıq, kartlar sadəcə siyahı olardı;
 * yan-yana duranda isə "bax, bu adamlar var" mənası çıxır.
 *
 * Kartlar API-dən gəlir və YALNIZ REALDIR. Baza boşdursa uydurma profil
 * göstərilmir — mövcud olmayan adama "əlaqə qur" düyməsi təklif etmək
 * platformanın bütün mənasını pozur. Bölmə yenə də gizlədilmir: otaq yoldaşı
 * axını əsas fərqdir və "burada belə bir şey var" mesajı profil olmayanda da
 * çatmalıdır.
 */

const CARD_COUNT = 3;

export function RoommateSection() {
  const [people, setPeople] = useState<RoommateCardDto[] | null>(null);

  useEffect(() => {
    api
      .get<{ items: RoommateCardDto[] }>('/roommates', { limit: CARD_COUNT })
      .then((res) => {
        setPeople(res.items.slice(0, CARD_COUNT));
      })
      .catch(() => {
        setPeople([]);
      });
  }, []);

  return (
    <section className="section bg-forest-50">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] lg:gap-10">
        <div className="lg:pt-2">
          <h2 className="flex items-start gap-2.5 text-h1 text-stone-900">
            <Users
              className="mt-1.5 size-6 shrink-0 text-sprout-600"
              strokeWidth={2}
              aria-hidden
            />
            Eyni evdə yaşayacağın insanı da seç.
          </h2>

          <p className="mt-4 text-lead leading-relaxed text-stone-600">
            Büdcə, universitet və yaşayış tərzinə uyğun tələbələrlə tanış ol.
          </p>

          <Link
            href="/otaq-yoldasi"
            className="mt-6 inline-flex h-12 items-center gap-2 rounded-[var(--radius-input)] bg-sprout-600 px-6 text-body font-semibold text-white transition-colors hover:bg-sprout-500 active:bg-sprout-700"
          >
            Otaq yoldaşlarını kəşf et
            <ArrowRight className="size-4" aria-hidden />
          </Link>

        </div>

        {/* Mobil-də üfüqi karusel: üç kartı alt-alta yığmaq bölməni həddindən
            artıq uzadır və növbəti bölmə gözdən itir. */}
        {people !== null && people.length === 0 ? (
          <div className="flex items-center rounded-[var(--radius-panel)] bg-white p-6 ring-1 ring-stone-200/70">
            <p className="text-body leading-relaxed text-stone-600">
              Hazırda görünən profil yoxdur. Öz profilini tamamla — uyğun tələbələr
              əlavə olunduqca burada görünəcək.
            </p>
          </div>
        ) : (
          <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-3">
            {people === null
              ? Array.from({ length: CARD_COUNT }).map((_, i) => (
                  <div key={i} className="w-[12.5rem] shrink-0 snap-start sm:w-auto">
                    <Skeleton className="h-[17rem] w-full rounded-[var(--radius-card)]" />
                  </div>
                ))
              : people.map((person) => (
                  <div
                    key={person.userId}
                    className="w-[12.5rem] shrink-0 snap-start sm:w-auto"
                  >
                    <RoommateCard person={person} className="h-full" />
                  </div>
                ))}
          </div>
        )}
      </div>
    </section>
  );
}
