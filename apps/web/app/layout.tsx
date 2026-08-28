import type { Metadata, Viewport } from 'next';
import { META } from '@yasayis/shared';
import { Fraunces, Plus_Jakarta_Sans } from 'next/font/google';
import { BottomNav, CreateListingFab } from '@/components/layout/bottom-nav';
import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { PulseSurvey } from '@/components/survey/pulse-survey';
import './globals.css';

// latin-ext altçoxluğu Azərbaycan hərflərini (ə, ğ, ı, ö, ü, ş, ç) əhatə edir.
// İnterfeys mətni: təmiz, neytral, yaxşı oxunan.
const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-jakarta',
  display: 'swap',
});

/**
 * Başlıqlar üçün dəyişkən serif.
 *
 * Serif seçimi məqsədlidir: platforma "ev" və "etibar" satır, sırf sans-serif
 * isə hər SaaS şablonu ilə eyni görünür. `SOFT`/`WONK` oxları sıfırdadır —
 * xarakter var, amma oynaq deyil.
 */
const fraunces = Fraunces({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-fraunces',
  display: 'swap',
  axes: ['SOFT', 'WONK', 'opsz'],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://yasayis.site'),
  // Mətnlər `packages/shared/src/marketing.ts` faylından gəlir — hero,
  // meta və sosial bio bir mənbədən oxuyur ki, vaxtla ayrılmasınlar.
  title: { default: META.title, template: '%s · Yaşayış' },
  description: META.description,
  openGraph: {
    type: 'website',
    locale: 'az_AZ',
    siteName: 'Yaşayış',
    title: META.ogTitle,
    description: META.ogDescription,
  },
  twitter: {
    card: 'summary_large_image',
    title: META.ogTitle,
    description: META.ogDescription,
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: '#105234',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="az" className={`${jakarta.variable} ${fraunces.variable}`}>
      <body className="flex min-h-dvh flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-[var(--radius-input)] focus:bg-forest-600 focus:px-4 focus:py-2 focus:text-white"
        >
          Əsas məzmuna keç
        </a>

        <SiteHeader />

        <main id="main" className="flex-1">
          {children}
        </main>

        <SiteFooter />

        {/* Mobil naviqasiya sabit dayanır, ona görə məzmuna onun hündürlüyü qədər
            boşluq əlavə olunur — son sətir düymələrin altında qalmasın. */}
        <div aria-hidden className="h-[var(--spacing-bottom-nav)] lg:hidden" />
        <BottomNav />
        <CreateListingFab />

        {/* Cavabsız sorğu yoxdursa heç nə render etmir. */}
        <PulseSurvey />
      </body>
    </html>
  );
}
