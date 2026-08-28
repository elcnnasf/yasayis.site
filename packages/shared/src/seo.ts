/**
 * SEO marşrutları və meta şablonları.
 *
 * Səhifələr taksonomiyadan avtomatik yaranır: admin yeni şəhər əlavə edəndə
 * onun landing səhifəsi də özü-özünə mövcud olur — kodda heç nə yazılmır.
 *
 * Meta mətnləri burada şablonlaşdırılıb ki, hər səhifə tipi üçün eyni səs
 * qorunsun və bir yerdən dəyişilsin.
 */

import { BRAND } from './marketing';

// ---------------------------------------------------------------------------
// Qorunan slug-lar
// ---------------------------------------------------------------------------

/**
 * Kök səviyyəsindəki statik marşrutlar.
 *
 * Şəhər səhifəsi `/[city]` kök səviyyədədir, ona görə şəhər slug-ı bu
 * siyahıdakı sözlərdən biri ola bilməz — əks halda `/admin` şəhər kimi
 * oxunardı. Admin yeni şəhər yaradanda server bunu yoxlayır.
 */
export const RESERVED_SLUGS: readonly string[] = [
  'admin',
  'api',
  'axtaris',
  'basla',
  'dizayn-sistemi',
  'elan',
  'elanlar',
  'evler',
  'giris',
  'haqqimizda',
  'elaqe',
  'mexfilik',
  'otaq',
  'otaq-yoldasi',
  'panel',
  'profil',
  'qaydalar',
  'qeydiyyat',
  'saxlanilanlar',
  'sitemap.xml',
  'robots.txt',
  'telebeler',
];

export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.includes(slug.toLowerCase());
}

// ---------------------------------------------------------------------------
// Səhifə tipləri
// ---------------------------------------------------------------------------

export const SEO_PAGE_KINDS = {
  /** /baki — şəhərdəki bütün elanlar */
  CITY: 'city',
  /** /baki/yasamal — rayon */
  DISTRICT: 'district',
  /** /evler/baki — yalnız evlər */
  HOMES: 'homes',
  /** /otaq-yoldasi/baki — otaq yoldaşı axtaranlar */
  ROOMMATES: 'roommates',
  /** /telebeler/baki — tələbələrə uyğun elanlar */
  STUDENTS: 'students',
} as const;
export type SeoPageKind = (typeof SEO_PAGE_KINDS)[keyof typeof SEO_PAGE_KINDS];

export interface SeoPlace {
  cityName: string;
  citySlug: string;
  districtName?: string;
  districtSlug?: string;
  /** Şəhərdəki aktiv elan sayı — mətndə işlədilmir, yalnız məzmun üçün. */
  listingCount?: number;
}

// ---------------------------------------------------------------------------
// Meta şablonları
// ---------------------------------------------------------------------------

export interface SeoMeta {
  title: string;
  description: string;
  h1: string;
  intro: string;
}

/**
 * Azərbaycan dilində yerlik hal şəkilçisi: "Bakı" → "Bakıda", "Gəncə" → "Gəncədə".
 *
 * Sadə saitlə uyğunlaşma qaydası. Söz samitlə bitəndə də eyni şəkilçi işləyir
 * ("Sumqayıt" → "Sumqayıtda"), yalnız kar samitdən sonra "-ta/-tə" olur.
 */
export function locative(name: string): string {
  const last = name.slice(-1).toLowerCase();
  const backVowels = ['a', 'ı', 'o', 'u'];
  const vowels = 'aeəiıouüö';

  // Sözün son saitini tap — şəkilçinin qalın/incə olmasını o müəyyən edir.
  let harmony: 'back' | 'front' = 'front';
  for (let i = name.length - 1; i >= 0; i--) {
    const ch = name[i]?.toLowerCase() ?? '';
    if (vowels.includes(ch)) {
      harmony = backVowels.includes(ch) ? 'back' : 'front';
      break;
    }
  }

  // Kar samitdən sonra "d" → "t" olur.
  const voiceless = ['p', 't', 'k', 'ç', 'ş', 's', 'x', 'f', 'h'];
  const consonant = voiceless.includes(last) ? 't' : 'd';
  const vowel = harmony === 'back' ? 'a' : 'ə';

  return `${name}${consonant}${vowel}`;
}

/** Səhifə tipinə görə meta mətnləri. */
export function buildSeoMeta(kind: SeoPageKind, place: SeoPlace): SeoMeta {
  const city = place.cityName;
  const inCity = locative(city);
  const area = place.districtName ?? city;
  const inArea = locative(area);

  switch (kind) {
    case SEO_PAGE_KINDS.DISTRICT:
      return {
        title: `${inArea} kirayə ev və otaq — ${city} | ${BRAND.name}`,
        description: `${inArea} tələbələr üçün kirayə ev, otaq və otaq yoldaşı elanları. Uyğunluq faizini gör, telefonla təsdiqlənmiş profillərlə əlaqə saxla.`,
        h1: `${inArea} kirayə ev və otaq`,
        intro: `${city}, ${area} üzrə tələbələrə uyğun elanlar. Qiymət, otaq sayı və universitetə yaxınlığa görə süz.`,
      };

    case SEO_PAGE_KINDS.HOMES:
      return {
        title: `${inCity} kirayə evlər və mənzillər | ${BRAND.name}`,
        description: `${inCity} tələbələr üçün kirayə ev və mənzil elanları. Kommunal, depozit və otaq sayına görə filtr, universitetə yaxınlıq etiketləri.`,
        h1: `${inCity} kirayə evlər`,
        intro: `${inCity} bütöv mənzil və ev elanları. Otaqda yer axtarırsansa, otaq bölməsinə keç.`,
      };

    case SEO_PAGE_KINDS.ROOMMATES:
      return {
        title: `${inCity} otaq yoldaşı axtaran tələbələr | ${BRAND.name}`,
        description: `${inCity} otaq yoldaşı axtaran tələbələr. Vərdiş, büdcə və universitetə görə uyğunluq faizi — təsadüfi deyil, sənə uyğun olanı seç.`,
        h1: `${inCity} otaq yoldaşı tap`,
        intro: `${inCity} otaq yoldaşı axtaran tələbə profilləri. Hər profilin yanında uyğunluq faizi və onun səbəbi göstərilir.`,
      };

    case SEO_PAGE_KINDS.STUDENTS:
      return {
        title: `${inCity} tələbələr üçün yaşayış | ${BRAND.name}`,
        description: `${inCity} tələbələr üçün kirayə ev, otaq və otaq yoldaşı. Universitetə yaxınlıq, şəffaf uyğunluq faizi, təsdiqlənmiş profillər.`,
        h1: `${inCity} tələbə yaşayışı`,
        intro: `${inCity} sahibi tərəfindən tələbələrə uyğun işarələnmiş elanlar və otaq yoldaşı profilləri.`,
      };

    case SEO_PAGE_KINDS.CITY:
    default:
      return {
        title: `${inCity} kirayə ev, otaq və otaq yoldaşı | ${BRAND.name}`,
        description: `${inCity} tələbələr üçün yaşayış: kirayə ev, otaq və otaq yoldaşı elanları. Uyğunluq faizini və səbəbini gör, üç addımda başla.`,
        h1: `${inCity} tələbələr üçün yaşayış`,
        intro: `${inCity} kirayə ev, otaq və otaq yoldaşı — hamısı bir yerdə. Rayona, qiymətə və universitetə yaxınlığa görə süz.`,
      };
  }
}

// ---------------------------------------------------------------------------
// Marşrut siyahısı (statik generasiya üçün)
// ---------------------------------------------------------------------------

export interface SeoRouteDto {
  citySlug: string;
  cityName: string;
  districts: { slug: string; name: string }[];
}

/** Sitemap üçün bütün ünvanlar. */
export function buildSitemapPaths(routes: SeoRouteDto[]): string[] {
  const paths = ['/', '/axtaris', '/otaq-yoldasi'];

  for (const route of routes) {
    paths.push(`/${route.citySlug}`);
    paths.push(`/evler/${route.citySlug}`);
    paths.push(`/otaq-yoldasi/${route.citySlug}`);
    paths.push(`/telebeler/${route.citySlug}`);
    for (const district of route.districts) {
      paths.push(`/${route.citySlug}/${district.slug}`);
    }
  }

  return paths;
}
