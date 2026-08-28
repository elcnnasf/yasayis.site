import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { buildSeoMeta, SEO_PAGE_KINDS } from '@yasayis/shared';
import { SeoLandingPage } from '@/components/seo/landing-page';
import {
  getCityBySlug,
  getDistricts,
  getListings,
  getSeoRoutes,
  getSiblingCities,
  getUniversities,
} from '@/lib/seo-data';

/**
 * Şəhər landing səhifəsi — /baki, /gence, ...
 *
 * Ünvanlar taksonomiyadan avtomatik yaranır: admin yeni şəhər əlavə edəndə
 * onun səhifəsi də mövcud olur. Kodda şəhər siyahısı yoxdur.
 *
 * `dynamicParams` açıqdır: build vaxtı olmayan şəhər sonradan əlavə olunanda
 * səhifə ilk sorğuda render olunur və keşlənir — yeni deploy gözləmir.
 */

export const dynamicParams = true;
export const revalidate = 600;

export async function generateStaticParams() {
  const routes = await getSeoRoutes();
  return routes.map((r) => ({ city: r.citySlug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ city: string }>;
}): Promise<Metadata> {
  const { city: slug } = await params;
  const city = await getCityBySlug(slug);
  if (!city) return { title: 'Səhifə tapılmadı' };

  const meta = buildSeoMeta(SEO_PAGE_KINDS.CITY, {
    cityName: city.name,
    citySlug: city.slug,
  });

  return {
    // `absolute` şablonu ləğv edir: SEO başlığı brendi onsuz da daşıyır,
    // əks halda "… | Yaşayış · Yaşayış" alınır.
    title: { absolute: meta.title },
    description: meta.description,
    alternates: { canonical: `/${city.slug}` },
    openGraph: { title: meta.title, description: meta.description, type: 'website' },
  };
}

export default async function CityPage({
  params,
}: {
  params: Promise<{ city: string }>;
}) {
  const { city: slug } = await params;
  const city = await getCityBySlug(slug);
  if (!city) notFound();

  const [districts, universities, listings, siblings] = await Promise.all([
    getDistricts(city.id),
    getUniversities(city.id),
    getListings({ cityId: city.id, sort: 'yeni' }),
    getSiblingCities(city.slug),
  ]);

  return (
    <SeoLandingPage
      kind={SEO_PAGE_KINDS.CITY}
      place={{ cityName: city.name, citySlug: city.slug }}
      listings={listings}
      districts={districts.map((d) => ({ slug: d.slug, name: d.name }))}
      universities={universities
        .filter((u) => !u.isOther)
        .map((u) => ({ shortName: u.shortName, name: u.name }))}
      siblingCities={siblings}
    />
  );
}
