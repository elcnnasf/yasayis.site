'use client';

import { useCallback, useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { SORT_OPTIONS, type Amenity, type OwnerType, type SortOption } from '@yasayis/shared';

/**
 * Filtrlərin vəziyyəti URL-də saxlanılır.
 *
 * Səbəb: axtarış nəticəsi paylaşıla və geri düyməsi ilə qaytarıla bilməlidir.
 * React state-də saxlansaydı, linki göndərəndə qarşı tərəf boş axtarış görərdi.
 */

export interface Filters {
  q?: string;
  cityId?: string;
  districtId?: string[];
  universityId?: string;
  priceMin?: number;
  priceMax?: number;
  roomCount?: number[];
  hasVacantRoom?: boolean;
  forStudents?: boolean;
  forWomen?: boolean;
  forMen?: boolean;
  petsAllowed?: boolean;
  smokingAllowed?: boolean;
  amenity?: Amenity[];
  noDeposit?: boolean;
  utilitiesIncluded?: boolean;
  ownerType?: OwnerType;
  sort: SortOption;
  page: number;
}

/** Sıralama və səhifə "filtr" sayılmır — sayğac yalnız daraldıcı seçimləri sayır. */
const NON_FILTER_KEYS = new Set(['sort', 'page', 'q']);

export function useFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const filters = useMemo<Filters>(() => {
    const num = (key: string) => {
      const raw = params.get(key);
      const value = raw ? Number(raw) : NaN;
      return Number.isFinite(value) ? value : undefined;
    };
    const bool = (key: string) => (params.get(key) === 'true' ? true : undefined);
    const list = (key: string) => {
      const raw = params.get(key);
      return raw ? raw.split(',').filter(Boolean) : undefined;
    };

    return {
      q: params.get('q') ?? undefined,
      cityId: params.get('cityId') ?? undefined,
      districtId: list('districtId'),
      universityId: params.get('universityId') ?? undefined,
      priceMin: num('priceMin'),
      priceMax: num('priceMax'),
      roomCount: list('roomCount')?.map(Number).filter(Number.isFinite),
      hasVacantRoom: bool('hasVacantRoom'),
      forStudents: bool('forStudents'),
      forWomen: bool('forWomen'),
      forMen: bool('forMen'),
      petsAllowed: bool('petsAllowed'),
      smokingAllowed: bool('smokingAllowed'),
      amenity: list('amenity') as Amenity[] | undefined,
      noDeposit: bool('noDeposit'),
      utilitiesIncluded: bool('utilitiesIncluded'),
      ownerType: (params.get('ownerType') as OwnerType | null) ?? undefined,
      sort: (params.get('sort') as SortOption | null) ?? SORT_OPTIONS.RELEVANT,
      page: num('page') ?? 1,
    };
  }, [params]);

  const write = useCallback(
    (next: Partial<Filters>, resetPage = true) => {
      const search = new URLSearchParams(params.toString());

      for (const [key, value] of Object.entries(next)) {
        if (
          value === undefined ||
          value === '' ||
          value === false ||
          (Array.isArray(value) && value.length === 0)
        ) {
          search.delete(key);
        } else {
          search.set(key, Array.isArray(value) ? value.join(',') : String(value));
        }
      }

      // Filtr dəyişəndə 3-cü səhifədə qalmaq mənasızdır.
      if (resetPage && !('page' in next)) search.delete('page');

      router.replace(`${pathname}?${search.toString()}`, { scroll: false });
    },
    [params, pathname, router],
  );

  const setFilter = useCallback(
    <K extends keyof Filters>(key: K, value: Filters[K]) => write({ [key]: value } as Partial<Filters>),
    [write],
  );

  const reset = useCallback(() => {
    const search = new URLSearchParams();
    const q = params.get('q');
    // Sərbəst mətn qalır — istifadəçi "filterləri təmizlə" deyəndə
    // axtardığı sözü də itirməyi gözləmir.
    if (q) search.set('q', q);
    router.replace(`${pathname}?${search.toString()}`, { scroll: false });
  }, [params, pathname, router]);

  const activeCount = useMemo(
    () =>
      Array.from(params.keys()).filter((key) => !NON_FILTER_KEYS.has(key)).length,
    [params],
  );

  /** API-yə göndərilən sorğu obyekti. */
  const queryParams = useMemo(() => {
    const out: Record<string, string> = {};
    params.forEach((value, key) => {
      if (value) out[key] = value;
    });
    return out;
  }, [params]);

  return { filters, setFilter, write, reset, activeCount, queryParams };
}
