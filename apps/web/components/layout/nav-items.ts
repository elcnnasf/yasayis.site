import { Heart, House, Search, UserRound, Users, type LucideIcon } from 'lucide-react';

/**
 * Naviqasiyanın YEGANƏ mənbəyi.
 *
 * İki siyahı var, çünki iki cihazda iki fərqli iş görülür:
 *
 *   PRIMARY_NAV (desktop, başlığın ortası) — üç BAZAR: ana səhifə, ev/otaq,
 *   otaq yoldaşı. Burada məqsəd platformanın nə olduğunu bir baxışda demək,
 *   ona görə "Saxlanılanlar" və "Profil" bura qarışmır — onlar hesab
 *   alətidir, bazar deyil, və sağ tərəfdə dayanır.
 *
 *   NAV_ITEMS (mobil, bottom navigation) — beş TƏYİNAT. Mobil-də sağ tərəf
 *   üçün yer yoxdur, ona görə hesab alətləri də bura düşür.
 *
 * Hər ikisi eyni faylda dayanır ki, birinə bölmə əlavə olunub digərində
 * unudulmasın.
 */

export interface NavItem {
  href: string;
  label: string;
  /** Mobil-də daha qısa yazı lazım olduqda. */
  shortLabel?: string;
  icon: LucideIcon;
  /** Giriş tələb edir — qonağa göstərilir, klikdə girişə yönləndirilir. */
  requiresAuth?: boolean;
}

/** Desktop başlığının ortası — üç bazar. */
export const PRIMARY_NAV: readonly NavItem[] = [
  { href: '/', label: 'Ana səhifə', icon: House },
  { href: '/axtaris', label: 'Ev & otaqlar', icon: Search },
  { href: '/otaq-yoldasi', label: 'Otaq yoldaşı', icon: Users },
];

/** Desktop başlığının sağı — hesab alətləri. */
export const UTILITY_NAV: readonly NavItem[] = [
  { href: '/saxlanilanlar', label: 'Saxlanılanlar', icon: Heart, requiresAuth: true },
  { href: '/profil', label: 'Profil', icon: UserRound, requiresAuth: true },
];

/** Mobil bottom navigation — beş təyinat. */
export const NAV_ITEMS: readonly NavItem[] = [
  { href: '/', label: 'Ana səhifə', shortLabel: 'Ana səhifə', icon: House },
  { href: '/axtaris', label: 'Axtar', icon: Search },
  { href: '/otaq-yoldasi', label: 'Otaq yoldaşı', shortLabel: 'Yoldaş', icon: Users },
  {
    href: '/saxlanilanlar',
    label: 'Saxlanılanlar',
    shortLabel: 'Saxlanan',
    icon: Heart,
    requiresAuth: true,
  },
  { href: '/profil', label: 'Profil', icon: UserRound, requiresAuth: true },
];

/** Həmişə görünən əsas CTA. */
export const CREATE_LISTING = {
  href: '/elan/yeni',
  label: 'Elan yerləşdir',
} as const;

/**
 * Aktiv bölmənin təyini.
 * Ana səhifə yalnız dəqiq uyğunluqda aktivdir, qalanları alt marşrutları da tutur
 * (`/elan/abc` açıqkən "Axtar" aktiv qalmır, amma `/axtaris?q=...` qalır).
 */
export function isActivePath(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}
