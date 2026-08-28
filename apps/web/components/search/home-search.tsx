'use client';

import { useEffect, useId, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { toQepik, type CityDto, type DistrictDto, type UniversityDto } from '@yasayis/shared';
import { api } from '@/lib/api-client';
import { Select } from '@/components/ui/field';

/**
 * Ana səhifədəki əsas axtarış.
 *
 * Hero ilə növbəti bölmənin arasına, hər ikisinin üstünə oturur — səhifənin
 * ən vacib aləti ilk ekranı tərk etmir və iki bölməni bir-birinə tikir.
 *
 * Yalnız dörd süzgəc var: şəhər, rayon, universitet və büdcə. Qalanı axtarış
 * səhifəsindədir; burada məqsəd istifadəçini bir-iki toxunuşla nəticələrə
 * çatdırmaqdır, tam filtr panelini göstərmək deyil.
 *
 * Rayon və universitet siyahısı şəhərdən asılıdır və şəhər seçilməyənə qədər
 * söndürülü qalır — boş açılan siyahı "sistem xarabdır" hissi verir, söndürülü
 * sahə isə niyəsini özü izah edir.
 *
 * Seçimlər URL-ə yazılır, ona görə nəticə linki paylaşıla bilər.
 */

/**
 * Büdcə sərbəst rəqəm deyil, hazır aralıqdır.
 *
 * Tələbə "maksimum neçə manat" sualına dəqiq cavab verə bilmir, "300–400
 * arası" isə onun düşündüyü formadır. Aralıqlar həm də nəticəni həddindən
 * artıq dar süzməkdən qoruyur.
 */
const BUDGET_RANGES: { value: string; label: string; min?: number; max?: number }[] = [
  { value: '', label: 'Seçin' },
  { value: '0-200', label: '200 AZN-ə qədər', max: 200 },
  { value: '200-300', label: '200 – 300 AZN', min: 200, max: 300 },
  { value: '300-400', label: '300 – 400 AZN', min: 300, max: 400 },
  { value: '400-500', label: '400 – 500 AZN', min: 400, max: 500 },
  { value: '500-', label: '500 AZN-dən yuxarı', min: 500 },
];

export function HomeSearch() {
  const router = useRouter();
  const id = useId();

  const [q, setQ] = useState('');
  const [cityId, setCityId] = useState('');
  const [districtId, setDistrictId] = useState('');
  const [universityId, setUniversityId] = useState('');
  const [budget, setBudget] = useState('');

  const [cities, setCities] = useState<CityDto[]>([]);
  const [districts, setDistricts] = useState<DistrictDto[]>([]);
  const [universities, setUniversities] = useState<UniversityDto[]>([]);

  useEffect(() => {
    api
      .get<CityDto[]>('/taxonomy/cities')
      .then(setCities)
      .catch(() => setCities([]));
  }, []);

  useEffect(() => {
    if (!cityId) {
      setDistricts([]);
      setUniversities([]);
      return;
    }
    api
      .get<DistrictDto[]>('/taxonomy/districts', { cityId })
      .then(setDistricts)
      .catch(() => setDistricts([]));
    api
      .get<UniversityDto[]>('/taxonomy/universities', { cityId })
      .then((list) => setUniversities(list.filter((u) => !u.isOther)))
      .catch(() => setUniversities([]));
  }, [cityId]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();

    const params = new URLSearchParams();
    if (q.trim().length >= 2) params.set('q', q.trim());
    if (cityId) params.set('cityId', cityId);
    if (districtId) params.set('districtId', districtId);
    if (universityId) params.set('universityId', universityId);

    const range = BUDGET_RANGES.find((r) => r.value === budget);
    if (range?.min !== undefined) params.set('priceMin', String(toQepik(range.min)));
    if (range?.max !== undefined) params.set('priceMax', String(toQepik(range.max)));

    router.push(`/axtaris${params.size ? `?${params.toString()}` : ''}`);
  };

  return (
    <form
      onSubmit={submit}
      aria-labelledby={`${id}-title`}
      className="rounded-[var(--radius-panel)] bg-white p-4 shadow-[var(--shadow-pop)] ring-1 ring-stone-200/70 sm:p-5"
    >
      <h2 id={`${id}-title`} className="sr-only">
        Yaşayış axtarışı
      </h2>

      {/*
        Desktopda hər şey bir sətirdə; mobil-də şaquli yığılır.
        Axtarış sahəsi qalan süzgəclərdən iki dəfə genişdir: ora yazılan mətn
        onlardan uzundur və dar sahədə kəsilir.
      */}
      <div className="grid items-end gap-3 lg:grid-cols-[minmax(0,2.1fr)_repeat(4,minmax(0,1fr))_auto]">
        <Cell label="Harada yaşamaq istəyirsən?" htmlFor={`${id}-q`}>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-stone-400"
              aria-hidden
            />
            <input
              id={`${id}-q`}
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Şəhər, rayon və ya universitet axtar..."
              className="h-12 w-full rounded-[var(--radius-input)] bg-white pl-10 pr-4 text-body outline-none ring-1 ring-stone-200 transition-shadow placeholder:text-stone-400 hover:ring-stone-300 focus:ring-2 focus:ring-forest-600"
            />
          </div>
        </Cell>

        <Cell label="Şəhər" htmlFor={`${id}-city`}>
          <Select
            id={`${id}-city`}
            className="h-12"
            value={cityId}
            onChange={(e) => {
              setCityId(e.target.value);
              setDistrictId('');
              setUniversityId('');
            }}
          >
            <option value="">Seçin</option>
            {cities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Cell>

        <Cell label="Rayon" htmlFor={`${id}-district`}>
          <Select
            id={`${id}-district`}
            className="h-12"
            value={districtId}
            disabled={districts.length === 0}
            onChange={(e) => setDistrictId(e.target.value)}
          >
            <option value="">
              {cityId && districts.length === 0 ? 'Rayon yoxdur' : 'Seçin'}
            </option>
            {districts.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </Select>
        </Cell>

        <Cell label="Universitet" htmlFor={`${id}-uni`}>
          <Select
            id={`${id}-uni`}
            className="h-12"
            value={universityId}
            disabled={universities.length === 0}
            onChange={(e) => setUniversityId(e.target.value)}
          >
            <option value="">Seçin</option>
            {universities.map((u) => (
              <option key={u.id} value={u.id}>
                {u.shortName ?? u.name}
              </option>
            ))}
          </Select>
        </Cell>

        <Cell label="Büdcə" htmlFor={`${id}-budget`}>
          <Select
            id={`${id}-budget`}
            className="h-12"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
          >
            {BUDGET_RANGES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </Select>
        </Cell>

        <button
          type="submit"
          className="inline-flex h-12 items-center justify-center gap-2 rounded-[var(--radius-input)] bg-sprout-600 px-8 text-body font-semibold text-white transition-colors hover:bg-sprout-500 active:bg-sprout-700"
        >
          <Search className="size-4 lg:hidden" aria-hidden />
          Axtar
        </button>
      </div>
    </form>
  );
}

/**
 * Etiket + sahə.
 *
 * Etiketlər sahələrin ÜSTÜNDƏDİR ki, seçim edildikdən sonra da hansı sütunun
 * nə olduğu görünsün — placeholder mətni seçimlə birlikdə itir və istifadəçi
 * "Nərimanov" yazısına baxıb bunun rayon, yoxsa universitet olduğunu bilmir.
 */
function Cell({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-stone-600">
        {label}
      </label>
      {children}
    </div>
  );
}
