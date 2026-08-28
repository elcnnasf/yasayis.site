'use client';

/**
 * "Son baxdıqların" — brauzerdə saxlanılır.
 *
 * Serverdə saxlamırıq: baxış tarixçəsi həssas məlumatdır və onu toplamaq üçün
 * məhsul səbəbi yoxdur — siyahı yalnız həmin cihazda lazımdır. Beləliklə
 * cədvəl, təmizləmə işi və məxfilik sualı da yaranmır.
 */

const KEY = 'yasayis:recent-listings';
const MAX = 8;

export interface RecentListing {
  slug: string;
  title: string;
  price: number;
  cityName: string;
  districtName: string | null;
  coverImageUrl: string | null;
  viewedAt: number;
}

function read(): RecentListing[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as RecentListing[]) : [];
  } catch {
    // Gizli rejim və ya bloklanmış saxlama — siyahı sadəcə boş qalır.
    return [];
  }
}

export function getRecentlyViewed(): RecentListing[] {
  return read().sort((a, b) => b.viewedAt - a.viewedAt);
}

export function rememberListing(entry: Omit<RecentListing, 'viewedAt'>): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = read().filter((r) => r.slug !== entry.slug);
    const next = [{ ...entry, viewedAt: Date.now() }, ...existing].slice(0, MAX);
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Saxlama işləmirsə funksiya sadəcə işləmir — səhifə pozulmur.
  }
}

export function clearRecentlyViewed(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* boş */
  }
}
