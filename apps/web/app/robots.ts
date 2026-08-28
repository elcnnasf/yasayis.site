import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://yasayis.site';

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Şəxsi və idarəetmə səhifələri indeksləşməməlidir.
      disallow: [
        '/admin',
        '/panel',
        '/profil',
        '/saxlanilanlar',
        '/basla',
        '/giris',
        '/qeydiyyat',
        '/parol-sifirla',
        // Komanda üçün komponent vitrini — saytın məzmunu deyil.
        '/dizayn-sistemi',
        '/api/',
      ],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
