import type {
  CityDto,
  DistrictDto,
  ListingSummaryDto,
  PagedResult,
  SeoRouteDto,
  UniversityDto,
} from '@yasayis/shared';

/**
 * SEO səhifələri üçün server tərəfli data.
 *
 * Bu funksiyalar YALNIZ server komponentlərində çağırılır — məzmun HTML-də
 * gəlməlidir ki, axtarış motoru JavaScript icra etmədən görsün.
 *
 * API əlçatan olmasa səhifə boş məzmunla açılır, 500 vermir: SEO səhifəsinin
 * çökməsi bütöv bir ünvan qrupunu indeksdən salar.
 */

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

/** Landing səhifələri nadir dəyişir — 10 dəqiqə keşlənir. */
const REVALIDATE = 600;

async function get<T>(path: string, fallback: T): Promise<T> {
  try {
    const response = await fetch(`${BASE}${path}`, {
      next: { revalidate: REVALIDATE },
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) return fallback;
    return (await response.json()) as T;
  } catch {
    return fallback;
  }
}

export function getSeoRoutes(): Promise<SeoRouteDto[]> {
  return get<SeoRouteDto[]>('/taxonomy/seo-routes', []);
}

export function getCityBySlug(slug: string): Promise<CityDto | null> {
  return get<CityDto | null>(`/taxonomy/cities/${slug}`, null);
}

export function getDistricts(cityId: string): Promise<DistrictDto[]> {
  return get<DistrictDto[]>(`/taxonomy/districts?cityId=${cityId}`, []);
}

export function getUniversities(cityId: string): Promise<UniversityDto[]> {
  return get<UniversityDto[]>(`/taxonomy/universities?cityId=${cityId}`, []);
}

export async function getListings(params: Record<string, string>): Promise<ListingSummaryDto[]> {
  const search = new URLSearchParams({ limit: '6', ...params });
  const page = await get<PagedResult<ListingSummaryDto>>(`/listings?${search}`, {
    items: [],
    total: 0,
    page: 1,
    pageCount: 1,
    capped: false,
  });
  return page.items;
}

/** Digər şəhərlərə keçidlər — cari şəhər çıxarılır. */
export async function getSiblingCities(
  currentSlug: string,
  limit = 12,
): Promise<{ slug: string; name: string }[]> {
  const routes = await getSeoRoutes();
  return routes
    .filter((r) => r.citySlug !== currentSlug)
    .slice(0, limit)
    .map((r) => ({ slug: r.citySlug, name: r.cityName }));
}
