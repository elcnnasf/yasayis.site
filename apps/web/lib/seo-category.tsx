import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  buildSeoMeta,
  SEO_PAGE_KINDS,
  type SeoPageKind,
} from "@yasayis/shared";
import { SeoLandingPage } from "@/components/seo/landing-page";
import {
  getCityBySlug,
  getDistricts,
  getListings,
  getSeoRoutes,
  getSiblingCities,
} from "./seo-data";

/**
 * Kateqoriya landing səhifələri — /evler/[city], /otaq-yoldasi/[city],
 * /telebeler/[city].
 *
 * Üçü də eyni quruluşdadır və yalnız filtr ilə mətndə fərqlənir. Üç ayrı
 * səhifə yazsaydıq, biri düzələndə qalan ikisi arxada qalardı — ona görə
 * ortaq fabrik.
 */

/**
 * SEO səhifələrinin yenilənmə aralığı (saniyə).
 *
 * Bu sabit SƏNƏDDİR, səhifələr onu import ETMİR: Next.js seqment
 * konfiqurasiyasını statik təhlillə oxuyur və `revalidate` üçün yalnız hərfi
 * ədəd qəbul edir. İdentifikator veriləndə `next build` "Invalid segment
 * configuration export" ilə dayanır. Ona görə hər səhifədə `export const
 * revalidate = 600` yazılır — dəyər dəyişəndə burası və üç səhifə birlikdə
 * yenilənməlidir.
 */
export const SEO_REVALIDATE_SECONDS = 600;

export async function generateStaticParams() {
  const routes = await getSeoRoutes();
  return routes.map((r) => ({ city: r.citySlug }));
}

/** Səhifə tipinə uyğun elan filtri. */
function filtersFor(kind: SeoPageKind, cityId: string): Record<string, string> {
  const base: Record<string, string> = { cityId, sort: "yeni" };

  switch (kind) {
    case SEO_PAGE_KINDS.HOMES:
      // Bütöv mənzil: boş otaq göstərilməyən elanlar.
      return { ...base, hasVacantRoom: "false" };
    case SEO_PAGE_KINDS.STUDENTS:
      return { ...base, forStudents: "true" };
    case SEO_PAGE_KINDS.ROOMMATES:
      // Otaq yoldaşı səhifəsində elanlar ikinci dərəcəlidir — boş otağı
      // olanlar daha uyğundur, çünki oxucu yer axtarır.
      return { ...base, hasVacantRoom: "true" };
    default:
      return base;
  }
}

export function makeMetadata(kind: SeoPageKind) {
  return async function generateMetadata({
    params,
  }: {
    params: Promise<{ city: string }>;
  }): Promise<Metadata> {
    const { city: slug } = await params;
    const city = await getCityBySlug(slug);
    if (!city) return { title: "Səhifə tapılmadı" };

    const meta = buildSeoMeta(kind, {
      cityName: city.name,
      citySlug: city.slug,
    });
    const prefix =
      kind === SEO_PAGE_KINDS.HOMES
        ? "evler"
        : kind === SEO_PAGE_KINDS.ROOMMATES
          ? "otaq-yoldasi"
          : "telebeler";

    return {
      // `absolute` şablonu ləğv edir: SEO başlığı brendi onsuz da daşıyır,
      // əks halda "… | Yaşayış · Yaşayış" alınır.
      title: { absolute: meta.title },
      description: meta.description,
      alternates: { canonical: `/${prefix}/${city.slug}` },
      openGraph: {
        title: meta.title,
        description: meta.description,
        type: "website",
      },
    };
  };
}

export function makePage(kind: SeoPageKind) {
  return async function CategoryCityPage({
    params,
  }: {
    params: Promise<{ city: string }>;
  }) {
    const { city: slug } = await params;
    const city = await getCityBySlug(slug);
    if (!city) notFound();

    const [districts, listings, siblings] = await Promise.all([
      getDistricts(city.id),
      getListings(filtersFor(kind, city.id)),
      getSiblingCities(city.slug),
    ]);

    return (
      <SeoLandingPage
        kind={kind}
        place={{ cityName: city.name, citySlug: city.slug }}
        listings={listings}
        districts={districts.map((d) => ({ slug: d.slug, name: d.name }))}
        siblingCities={siblings}
      />
    );
  };
}
