'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell } from 'lucide-react';
import { api } from '@/lib/api-client';

/**
 * Başlıqdakı bildiriş zəngi.
 *
 * Qonağa göstərilmir: sayğac sorğusu 401 qaytaranda komponent özünü gizlədir.
 * Beləliklə giriş etməmiş istifadəçi həmişə "0" göstərən ölü ikon görmür.
 *
 * Sayğac səhifə keçidində yenidən oxunur — bildirişi oxuyub geri qayıdanda
 * rəqəm köhnə qalmasın. Ayrıca fon sorğusu (polling) YOXDUR: hər açıq tab-dan
 * dəqiqədə bir sorğu göndərmək bu ölçüdə platformada baha başa gəlir və
 * bildirişlər real vaxt tələb etmir.
 */
export function NotificationBell({ className }: { className?: string }) {
  const pathname = usePathname();
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    api
      .get<{ count: number }>('/me/notifications/unread-count')
      .then((r) => {
        if (!cancelled) setCount(r.count);
      })
      .catch(() => {
        if (!cancelled) setCount(null);
      });

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  if (count === null) return null;

  return (
    <Link
      href="/panel/bildirisler"
      aria-label={count > 0 ? `Bildirişlər — ${count} oxunmamış` : 'Bildirişlər'}
      className={`relative grid size-10 place-items-center rounded-[var(--radius-input)] text-stone-300 transition-colors hover:bg-white/10 hover:text-white ${className ?? ''}`}
    >
      <Bell className="size-5" strokeWidth={1.8} aria-hidden />
      {count > 0 && (
        <span
          aria-hidden
          className="absolute right-1 top-1 grid min-w-4 place-items-center rounded-full bg-sprout-500 px-1 text-[0.625rem] font-bold leading-4 text-white"
        >
          {count > 9 ? '9+' : count}
        </span>
      )}
    </Link>
  );
}
