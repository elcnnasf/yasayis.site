'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Bell, Check, CheckCheck } from 'lucide-react';
import { api, ApiRequestError } from '@/lib/api-client';
import { relativeTime, viewOf, type NotificationDto } from '@/lib/notifications';
import { EmptyState } from '@/components/empty/empty-state';
import { Button, ButtonLink } from '@/components/ui/button';
import { Panel, Skeleton } from '@/components/ui/card';
import { cn } from '@/lib/cn';

/**
 * Bildiriş siyahısı.
 *
 * Bu ekran əvvəl ÜMUMİYYƏTLƏ yox idi: server elan təsdiqi, qiymət dəyişikliyi,
 * saxlanmış axtarışa uyğun yeni elan və təsdiq qərarı üçün bildiriş yazırdı,
 * amma istifadəçinin onları görəcəyi heç bir yer yox idi.
 *
 * Oxunma qeydi optimist yenilənir — sətir dərhal solğunlaşır, server sorğusu
 * arxada gedir. Sorğu uğursuz olsa da itki yoxdur: siyahı növbəti açılışda
 * serverdən yenidən oxunur.
 */

export function NotificationList({ compact = false }: { compact?: boolean }) {
  const [items, setItems] = useState<NotificationDto[] | null>(null);
  const [unauthorized, setUnauthorized] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;

    api
      .get<NotificationDto[]>('/me/notifications')
      .then((rows) => {
        if (!cancelled) setItems(rows);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        if (e instanceof ApiRequestError && (e.status === 401 || e.status === 403)) {
          setUnauthorized(true);
        }
        setItems([]);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const markRead = useCallback((id: string) => {
    setItems((rows) =>
      rows?.map((r) => (r.id === id && !r.readAt ? { ...r, readAt: new Date().toISOString() } : r)) ??
      rows,
    );
    void api.post(`/me/notifications/${id}/read`).catch(() => undefined);
  }, []);

  const markAllRead = useCallback(async () => {
    setBusy(true);
    const now = new Date().toISOString();
    setItems((rows) => rows?.map((r) => (r.readAt ? r : { ...r, readAt: now })) ?? rows);
    await api.post('/me/notifications/read-all').catch(() => undefined);
    setBusy(false);
  }, []);

  if (items === null) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (unauthorized) {
    return (
      <EmptyState
        icon={Bell}
        title="Bildirişləri görmək üçün daxil ol."
        description="Elanın təsdiqləndikdə, saxladığın axtarışa uyğun ev çıxdıqda və qiymət dəyişdikdə buraya yazacağıq."
        actions={<ButtonLink href="/giris?davam=/panel/bildirisler">Daxil ol</ButtonLink>}
      />
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={Bell}
        title="Hələ bildirişin yoxdur."
        description="Saxladığın axtarışa uyğun elan çıxanda və ya elanının statusu dəyişəndə burada görünəcək."
        actions={<ButtonLink href="/axtaris">Axtarışa başla</ButtonLink>}
      />
    );
  }

  const unread = items.filter((i) => !i.readAt).length;

  return (
    <div className="flex flex-col gap-3">
      {unread > 0 && (
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-stone-600">{unread} oxunmamış bildiriş</p>
          <Button size="sm" variant="tertiary" loading={busy} onClick={() => void markAllRead()}>
            <CheckCheck className="size-4" aria-hidden />
            Hamısını oxunmuş say
          </Button>
        </div>
      )}

      <ul className={cn('flex flex-col gap-2', compact && 'gap-1.5')}>
        {items.map((n) => (
          <li key={n.id}>
            <NotificationRow notification={n} onRead={markRead} compact={compact} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function NotificationRow({
  notification,
  onRead,
  compact,
}: {
  notification: NotificationDto;
  onRead: (id: string) => void;
  compact: boolean;
}) {
  const { title, detail, href } = viewOf(notification);
  const unread = !notification.readAt;

  const body = (
    <>
      <span
        aria-hidden
        className={cn(
          'mt-1.5 size-2 shrink-0 rounded-full',
          unread ? 'bg-sprout-600' : 'bg-transparent',
        )}
      />
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            'block text-body',
            unread ? 'font-semibold text-stone-900' : 'text-stone-700',
          )}
        >
          {title}
        </span>
        {detail && <span className="mt-0.5 block truncate text-sm text-stone-600">{detail}</span>}
        <span className="mt-1 block text-2xs text-stone-400">
          {relativeTime(notification.createdAt)}
        </span>
      </span>
    </>
  );

  const shell = cn(
    'flex w-full gap-2.5 rounded-[var(--radius-input)] p-3 text-left transition-colors',
    unread ? 'bg-sprout-50/60 hover:bg-sprout-50' : 'hover:bg-stone-50',
    compact && 'p-2.5',
  );

  return (
    <Panel className="overflow-hidden p-0">
      <div className="flex items-start">
        {href ? (
          <Link href={href} onClick={() => unread && onRead(notification.id)} className={shell}>
            {body}
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => unread && onRead(notification.id)}
            className={shell}
          >
            {body}
          </button>
        )}

        {unread && (
          <button
            type="button"
            aria-label="Oxunmuş kimi işarələ"
            onClick={() => onRead(notification.id)}
            className="m-2 grid size-8 shrink-0 place-items-center rounded-[var(--radius-input)] text-stone-400 transition-colors hover:bg-stone-100 hover:text-forest-700"
          >
            <Check className="size-4" aria-hidden />
          </button>
        )}
      </div>
    </Panel>
  );
}
