'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Plus, Search } from 'lucide-react';
import { Wordmark } from '@/components/brand/logo';
import { MessageBell } from '@/components/messages/message-bell';
import { NotificationBell } from '@/components/notifications/notification-bell';
import { cn } from '@/lib/cn';
import { CREATE_LISTING, isActivePath, PRIMARY_NAV, UTILITY_NAV } from './nav-items';

/**
 * Sayt başlığı — TÜND səth.
 *
 * Başlıq, hero və footer eyni tünd rəngdən kəsilir. Bu bir qərardır: səhifə
 * yuxarıdan və aşağıdan eyni rəngə bağlanır, açıq məzmun isə onun içində
 * çərçivəyə alınmış kimi oxunur. Ağ başlıq üzərində ağ hero olsaydı, ikisi
 * arasındakı sərhəd itərdi və səhifə "başlanğıcsız" görünərdi.
 *
 * Bölgü: solda loqo, ortada üç BAZAR, sağda hesab alətləri və əsas CTA.
 * Orta hissə "bu sayt nədir" sualına cavab verir, sağ hissə "mənim hesabım"
 * işidir — ona görə "Saxlanılanlar" və "Profil" ortaya qarışmır.
 *
 * Mobil: yalnız loqo, axtarış qısayolu və giriş. Beş təyinat aşağıdakı bottom
 * navigation-dadır, təkrar göstərilmir.
 */
export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 bg-ink-900/95 backdrop-blur-md">
      <div className="mx-auto flex h-[var(--spacing-header)] max-w-7xl items-center gap-4 px-4 sm:px-6">
        <Link
          href="/"
          className="shrink-0 rounded-[var(--radius-input)] text-white"
          aria-label="Yasayis — ana səhifə"
        >
          <Wordmark />
        </Link>

        <nav
          aria-label="Əsas naviqasiya"
          className="hidden flex-1 items-center justify-center gap-1 lg:flex"
        >
          {PRIMARY_NAV.map((item) => (
            <NavLink key={item.href} href={item.href} pathname={pathname}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1.5 lg:ml-0 lg:gap-1">
          {/* Hər ikisi qonağa görünmür — komponentlər özləri 401-də gizlənir. */}
          <MessageBell />
          <NotificationBell />

          <div className="hidden items-center gap-1 lg:flex">
            {UTILITY_NAV.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink key={item.href} href={item.href} pathname={pathname} muted>
                  <Icon className="size-4 shrink-0" strokeWidth={1.8} aria-hidden />
                  {item.label}
                </NavLink>
              );
            })}
          </div>

          {/* Mobil qısayollar — bottom nav-da olmayan tək şey axtarışdır. */}
          <Link
            href="/axtaris"
            aria-label="Axtar"
            className="grid size-10 place-items-center rounded-[var(--radius-input)] text-stone-300 transition-colors hover:bg-white/10 hover:text-white lg:hidden"
          >
            <Search className="size-5" aria-hidden />
          </Link>

          {/* Əsas CTA — səhifədə tək doymuş yaşıl düymə. */}
          <Link
            href={CREATE_LISTING.href}
            className="ml-1 inline-flex h-10 items-center gap-1.5 rounded-[var(--radius-input)] bg-sprout-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-sprout-500 active:bg-sprout-700"
          >
            <Plus className="size-4" aria-hidden />
            <span className="hidden sm:inline">{CREATE_LISTING.label}</span>
            <span className="sr-only sm:hidden">{CREATE_LISTING.label}</span>
          </Link>
        </div>
      </div>
    </header>
  );
}

/**
 * Başlıqdakı naviqasiya linki.
 *
 * Aktiv bölmə altdan qısa yaşıl xətt ilə işarələnir — fon dəyişikliyi tünd
 * başlıqda düymələrlə qarışır və "bura klikləndi" kimi oxunur.
 */
function NavLink({
  href,
  pathname,
  muted,
  children,
}: {
  href: string;
  pathname: string;
  /** Hesab alətləri üçün — bazarlardan bir ton geri dayanır. */
  muted?: boolean;
  children: React.ReactNode;
}) {
  const active = isActivePath(pathname, href);

  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'relative inline-flex items-center gap-1.5 rounded-[var(--radius-input)] px-3.5 py-2 transition-colors',
        muted ? 'text-sm' : 'text-body',
        active
          ? 'font-semibold text-white'
          : cn(
              'font-medium hover:text-white',
              muted ? 'text-stone-400' : 'text-stone-300',
            ),
      )}
    >
      {children}
      {active && (
        <span
          aria-hidden
          className="absolute inset-x-3.5 -bottom-1 h-0.5 rounded-full bg-sprout-500"
        />
      )}
    </Link>
  );
}
