import type { MetadataRoute } from 'next';
import { buildSitemapPaths } from '@yasayis/shared';
import { getSeoRoutes } from '@/lib/seo-data';

/**
 * Sitemap taksonomiyadan avtomatik yaranır.
 * Admin yeni şəhər əlavə edəndə onun bütün ünvanları burada da görünür —
 * heç bir siyahı əl ilə yenilənmir.
 */
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://yasayis.site';
  const routes = await getSeoRoutes();
  const now = new Date();

  return buildSitemapPaths(routes).map((path) => ({
    url: `${base}${path}`,
    lastModified: now,
    // Ana səhifə və şəhər səhifələri daha tez-tez dəyişir.
    changeFrequency: path === '/' ? 'daily' : 'weekly',
    priority: path === '/' ? 1 : path.split('/').length === 2 ? 0.8 : 0.6,
  }));
}
