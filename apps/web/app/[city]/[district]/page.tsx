import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { buildSeoMeta, SEO_PAGE_KINDS } from '@yasayis/shared';
import { SeoLandingPage } from '@/components/seo/landing-page';
import {
  getCityBySlug,
  getDistricts,
  getListings,
  getSeoRoutes,
} from '@/lib/seo-data';

/**
 * Rayon landing səhifəsi — /baki/yasamal, /baki/nerimanov, ...
 *
 * Hər City × District kombinasiyası üçün avtomatik yaranır.
 */

export const dynamicParams = true;
export const revalidate = 600;

export async function generateStaticParams() {
  const routes = await getSeoRoutes();
  return routes.flatMap((r) =>
    r.districts.map((d) => ({ city: r.citySlug, district: d.slug })),
  );
}

/** Şəhər və rayonu bir yerdə tapır — hər iki səhifə eyni yoxlamanı işlədir. */
async function resolve(citySlug: string, districtSlug: string) {
  const city = await getCityBySlug(citySlug);
  if (!city) return null;

  const districts = await getDistricts(city.id);
  const district = districts.find((d) => d.slug === districtSlug);
  if (!district) return null;

  return { city, district, districts };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ city: string; district: string }>;
}): Promise<Metadata> {
  const { city: citySlug, district: districtSlug } = await params;
  const found = await resolve(citySlug, districtSlug);
  if (!found) return { title: 'Səhifə tapılmadı' };

  const meta = buildSeoMeta(SEO_PAGE_KINDS.DISTRICT, {
    cityName: found.city.name,
    citySlug: found.city.slug,
    districtName: found.district.name,
    districtSlug: found.district.slug,
  });

  return {
    // `absolute` şablonu ləğv edir: SEO başlığı brendi onsuz da daşıyır,
    // əks halda "… | Yaşayış · Yaşayış" alınır.
    title: { absolute: meta.title },
    description: meta.description,
    alternates: { canonical: `/${found.city.slug}/${found.district.slug}` },
    openGraph: { title: meta.title, description: meta.description, type: 'website' },
  };
}

export default async function DistrictPage({
  params,
}: {
  params: Promise<{ city: string; district: string }>;
}) {
  const { city: citySlug, district: districtSlug } = await params;
  const found = await resolve(citySlug, districtSlug);
  if (!found) notFound();

  const listings = await getListings({
    cityId: found.city.id,
    districtId: found.district.id,
    sort: 'yeni',
  });

  return (
    <SeoLandingPage
      kind={SEO_PAGE_KINDS.DISTRICT}
      place={{
        cityName: found.city.name,
        citySlug: found.city.slug,
        districtName: found.district.name,
        districtSlug: found.district.slug,
      }}
      listings={listings}
      // Qonşu rayonlar — cari olan çıxarılır.
      districts={found.districts
        .filter((d) => d.slug !== found.district.slug)
        .map((d) => ({ slug: d.slug, name: d.name }))}
    />
  );
}
