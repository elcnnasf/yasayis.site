'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/cn';
import { CREATE_LISTING, isActivePath, NAV_ITEMS } from './nav-items';

/**
 * Mobil bottom navigation — 5 təyinat.
 *
 * Yalnız `lg` breakpoint-dən aşağıda görünür; desktopda eyni beş təyinat
 * header-dəki üfüqi naviqasiyaya keçir.
 *
 * Aktiv bölmə iki siqnalla göstərilir — rəng və yuxarıdakı qısa zolaq — çünki
 * tək rəng dəyişikliyi rəng ayırdetməsi zəif olan istifadəçilər üçün kifayət deyil.
 */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Əsas naviqasiya"
      className="pb-safe fixed inset-x-0 bottom-0 z-40 bg-white/95 shadow-[var(--shadow-nav)] backdrop-blur-md lg:hidden"
    >
      <ul className="mx-auto flex max-w-lg items-stretch">
        {NAV_ITEMS.map((item) => {
          const active = isActivePath(pathname, item.href);
          const Icon = item.icon;

          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'relative flex h-[var(--spacing-bottom-nav)] flex-col items-center justify-center gap-1 px-1 transition-colors',
                  active ? 'text-forest-800' : 'text-stone-500 hover:text-stone-700',
                )}
              >
                {/* Aktiv ikon yumşaq həbin içindədir — rəngdən əlavə forma
                    siqnalı, rəng ayırdetməsi zəif istifadəçilər üçün. */}
                <span
                  aria-hidden
                  className={cn(
                    'grid size-8 place-items-center rounded-full transition-colors',
                    active ? 'bg-forest-100' : 'bg-transparent',
                  )}
                >
                  <Icon
                    className="size-[21px] shrink-0"
                    strokeWidth={active ? 2.2 : 1.8}
                    aria-hidden
                  />
                </span>
                <span
                  className={cn(
                    'text-2xs leading-none',
                    active ? 'font-bold' : 'font-medium',
                  )}
                >
                  {item.shortLabel ?? item.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/**
 * Mobil üçün üzən "Elan yerləşdir" düyməsi.
 *
 * Bottom navigation-a altıncı element kimi sıxışdırmaq əvəzinə ayrıca üzən
 * düymədir: beş təyinat naviqasiyadır, bu isə hərəkətdir — qarışdırmaq
 * istifadəçini çaşdırır. Naviqasiyanın üstündə dayanır.
 */
export function CreateListingFab({ className }: { className?: string }) {
  return (
    <Link
      href={CREATE_LISTING.href}
      aria-label={CREATE_LISTING.label}
      className={cn(
        'fixed bottom-[5.25rem] right-4 z-40 flex size-14 items-center justify-center rounded-full',
        'bg-sprout-600 text-white shadow-[var(--shadow-pop)] transition-colors',
        'hover:bg-sprout-500 active:bg-sprout-700 lg:hidden',
        className,
      )}
    >
      <Plus className="size-6" aria-hidden />
    </Link>
  );
}
