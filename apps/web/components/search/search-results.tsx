'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import {
  sortLabels,
  SORT_OPTIONS,
  type CityDto,
  type DistrictDto,
  type ListingSummaryDto,
  type PagedResult,
  type SortOption,
  type UniversityDto,
} from '@yasayis/shared';
import { api, ApiRequestError } from '@/lib/api-client';
import { NoListingsFound } from '@/components/empty/empty-state';
import { ListingCard } from '@/components/listing/listing-card';
import { Button } from '@/components/ui/button';
import { ListingCardSkeleton } from '@/components/ui/card';
import { Select } from '@/components/ui/field';
import { FilterPanel } from './filter-panel';
import { useFilters } from './use-filters';

/**
 * Axtarış nəticələri.
 *
 * Filtrlər URL-dədir, ona görə hər dəyişiklikdə sorğu yenidən gedir və
 * nəticə linki paylaşıla bilir.
 */
export function SearchResults() {
  const { filters, setFilter, write, reset, activeCount, queryParams } = useFilters();

  const [result, setResult] = useState<PagedResult<ListingSummaryDto> | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [alertNotice, setAlertNotice] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [cities, setCities] = useState<CityDto[]>([]);
  const [districts, setDistricts] = useState<DistrictDto[]>([]);
  const [universities, setUniversities] = useState<UniversityDto[]>([]);

  const key = useMemo(() => new URLSearchParams(queryParams).toString(), [queryParams]);

  useEffect(() => {
    api
      .get<CityDto[]>('/taxonomy/cities')
      .then(setCities)
      .catch(() => setCities([]));
  }, []);

  useEffect(() => {
    if (!filters.cityId) {
      setDistricts([]);
      setUniversities([]);
      return;
    }
    api
      .get<DistrictDto[]>('/taxonomy/districts', { cityId: filters.cityId })
      .then(setDistricts)
      .catch(() => setDistricts([]));
    api
      .get<UniversityDto[]>('/taxonomy/universities', { cityId: filters.cityId })
      .then((list) => setUniversities(list.filter((u) => !u.isOther)))
      .catch(() => setUniversities([]));
  }, [filters.cityId]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setFailed(false);

    api
      .get<PagedResult<ListingSummaryDto>>('/listings', queryParams)
      .then((res) => {
        if (cancelled) return;
        setResult(res);
      })
      .catch(() => {
        if (!cancelled) {
          setFailed(true);
          setResult(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [key, queryParams, activeCount]);

  /**
   * Cari filtri "axtarış bildirişi" kimi saxlayır.
   *
   * Filtrləri ikinci dəfə ayrıca formada doldurtmaq əvəzinə ekranda görünəni
   * olduğu kimi saxlayırıq — istifadəçi onsuz da istədiyi nəticəni burada
   * qurub. Bildiriş sxemi yalnız bir neçə sahəni qəbul edir, ona görə çoxseçimli
   * filtrlərdən (rayon, otaq sayı) yalnız birincisi götürülür.
   */
  const createAlert = useCallback(async () => {
    setAlertNotice(null);
    try {
      await api.post('/me/search-alerts', {
        cityId: filters.cityId ?? null,
        districtId: filters.districtId?.[0] ?? null,
        universityId: filters.universityId ?? null,
        priceMin: filters.priceMin ?? null,
        priceMax: filters.priceMax ?? null,
        roomCount: filters.roomCount?.[0] ?? null,
        studentOnly: filters.forStudents === true,
      });
      setAlertNotice('Axtarış saxlanıldı. Uyğun elan yerləşəndə bildiriş göndərəcəyik.');
    } catch (e) {
      setAlertNotice(
        e instanceof ApiRequestError && (e.status === 401 || e.status === 403)
          ? 'Bildiriş yaratmaq üçün daxil olun.'
          : e instanceof ApiRequestError
            ? e.message
            : 'Saxlamaq alınmadı. Bir azdan yenidən yoxlayın.',
      );
    }
  }, [filters]);

  const total = result?.total ?? 0;
  const selectedUniversity = universities.find((u) => u.id === filters.universityId);

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:items-start">
      <FilterPanel
        filters={filters}
        setFilter={setFilter}
        reset={reset}
        activeCount={activeCount}
        cities={cities}
        districts={districts}
        universities={universities}
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
      />

      <div className="flex min-w-0 flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-h2 text-stone-900">
              {loading
                ? 'Axtarılır…'
                : failed
                  ? 'Nəticə alınmadı'
                  : `${result?.capped ? `${total}+` : total} elan tapıldı`}
            </h1>
            {selectedUniversity && !loading && (
              <p className="mt-1 text-sm text-stone-600">
                {selectedUniversity.shortName ?? selectedUniversity.name}-yə yaxın
                elanlar öndədir.
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="tertiary"
              size="sm"
              className="lg:hidden"
              onClick={() => setFiltersOpen(true)}
            >
              <SlidersHorizontal className="size-4" aria-hidden />
              Filterlər
              {activeCount > 0 && (
                <span className="tabular ml-1 rounded-full bg-forest-600 px-1.5 text-2xs text-white">
                  {activeCount}
                </span>
              )}
            </Button>

            <Select
              aria-label="Sıralama"
              value={filters.sort}
              onChange={(e) => setFilter('sort', e.target.value as SortOption)}
              className="h-9 w-auto text-sm"
            >
              {(Object.values(SORT_OPTIONS) as SortOption[]).map((option) => (
                <option key={option} value={option}>
                  {sortLabels[option]}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <ListingCardSkeleton key={i} />
            ))}
          </div>
        ) : total === 0 || failed ? (
          <>
            {alertNotice && <AlertNotice text={alertNotice} />}
            <NoListingsFound
              onChangeFilters={
                activeCount > 0
                  ? () => (window.innerWidth < 1024 ? setFiltersOpen(true) : reset())
                  : undefined
              }
              onCreateAlert={createAlert}
            />
          </>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
              {result?.items.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>

            {result && result.pageCount > 1 && (
              <Pagination
                page={result.page}
                pageCount={result.pageCount}
                onChange={(page) => {
                  write({ page }, false);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Pagination({
  page,
  pageCount,
  onChange,
}: {
  page: number;
  pageCount: number;
  onChange: (page: number) => void;
}) {
  return (
    <nav
      aria-label="Səhifələr"
      className="flex items-center justify-center gap-2 pt-2"
    >
      <Button
        variant="tertiary"
        size="sm"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        Əvvəlki
      </Button>
      <span className="tabular px-2 text-sm text-stone-600">
        {page} / {pageCount}
      </span>
      <Button
        variant="tertiary"
        size="sm"
        disabled={page >= pageCount}
        onClick={() => onChange(page + 1)}
      >
        Növbəti
      </Button>
    </nav>
  );
}

/**
 * Bildiriş saxlandıqdan sonrakı qısa mesaj.
 *
 * `role="status"` seçilib, `alert` yox: bu, xəta deyil, təsdiqdir — ekran
 * oxuyucu istifadəçinin işini kəsmədən oxusun.
 */
function AlertNotice({ text }: { text: string }) {
  return (
    <p
      role="status"
      className="mb-4 rounded-[var(--radius-input)] bg-sprout-50 px-3.5 py-2.5 text-sm text-forest-700 ring-1 ring-sprout-200/70"
    >
      {text}
    </p>
  );
}
