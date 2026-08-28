'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { BellOff, BellRing, Trash2 } from 'lucide-react';
import { formatBudgetRange, formatPrice } from '@yasayis/shared';
import { api, ApiRequestError } from '@/lib/api-client';
import { EmptyState } from '@/components/empty/empty-state';
import { Button, ButtonLink, IconButton } from '@/components/ui/button';
import { Card, Panel, Skeleton } from '@/components/ui/card';

/**
 * Saxlanmış axtarışlar.
 *
 * Bu bölmə platformanın ilk dövrü üçün xüsusilə vacibdir: elan sayı azdır və
 * axtarışın çox hissəsi boş nəticə ilə bitir. Boş nəticədən çıxış yolu ya
 * "başqa şeyə bax", ya da "yeni elan gələndə mənə de"-dir — ikincisi
 * istifadəçini itirmir.
 *
 * Yeni bildiriş burada YARADILMIR: filtrlər axtarış səhifəsindədir və onları
 * ikinci dəfə burada da qurmaq eyni işi iki yerdə saxlamaq deməkdir. Bunun
 * əvəzinə istifadəçi axtarış səhifəsində filtri seçib oradan saxlayır.
 */

/** API Prisma sətrini olduğu kimi qaytarır — burada yalnız lazım olan sahələr. */
interface SearchAlertRow {
  id: string;
  name: string | null;
  priceMin: number | null;
  priceMax: number | null;
  roomCount: number | null;
  studentOnly: boolean;
  isActive: boolean;
  createdAt: string;
  city: { name: string } | null;
  district: { name: string } | null;
  university: { shortName: string | null; name: string } | null;
}

export function SearchAlerts() {
  const [alerts, setAlerts] = useState<SearchAlertRow[] | null>(null);
  const [guest, setGuest] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(() => {
    api
      .get<SearchAlertRow[]>('/me/search-alerts')
      .then((rows) => {
        setAlerts(rows);
        setGuest(false);
      })
      .catch((e: unknown) => {
        if (e instanceof ApiRequestError && (e.status === 401 || e.status === 403)) {
          setGuest(true);
        }
        setAlerts([]);
      });
  }, []);

  useEffect(load, [load]);

  const toggle = async (alert: SearchAlertRow) => {
    setBusyId(alert.id);
    // Optimist yeniləmə: açar dərhal çevrilir, xəta olsa geri qaytarılır.
    setAlerts((rows) =>
      rows?.map((r) => (r.id === alert.id ? { ...r, isActive: !r.isActive } : r)) ?? null,
    );
    await api
      .patch(`/me/search-alerts/${alert.id}`, { isActive: !alert.isActive })
      .catch(() => {
        setAlerts((rows) =>
          rows?.map((r) => (r.id === alert.id ? { ...r, isActive: alert.isActive } : r)) ??
          null,
        );
      });
    setBusyId(null);
  };

  const remove = async (id: string) => {
    setBusyId(id);
    const previous = alerts;
    setAlerts((rows) => rows?.filter((r) => r.id !== id) ?? null);
    await api.delete(`/me/search-alerts/${id}`).catch(() => setAlerts(previous));
    setBusyId(null);
  };

  if (guest) {
    return (
      <EmptyState
        icon={BellRing}
        title="Axtarış bildirişləri üçün daxil ol."
        description="Bildirişlər hesabına bağlıdır — uyğun elan yerləşəndə sənə xəbər verə bilməyimiz üçün kim olduğunu bilməliyik."
        actions={
          <>
            <ButtonLink href="/giris?davam=/panel/axtaris-bildirisleri">Daxil ol</ButtonLink>
            <ButtonLink href="/qeydiyyat" variant="tertiary">
              Qeydiyyatdan keç
            </ButtonLink>
          </>
        }
      />
    );
  }

  if (alerts === null) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-[var(--radius-card)]" />
        ))}
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <EmptyState
        icon={BellRing}
        title="Hələ saxlanmış axtarışın yoxdur."
        description="Axtarış səhifəsində filtrləri seç və nəticənin altındakı 'Axtarış bildirişi yarat' düyməsinə bas — uyğun elan yerləşəndə xəbər verəcəyik."
        actions={<ButtonLink href="/axtaris">Axtarışa keç</ButtonLink>}
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {alerts.map((alert) => (
        <Card key={alert.id} className="flex items-start gap-4 p-4">
          <div className="min-w-0 flex-1">
            <p className="text-body font-semibold text-stone-900">
              {alert.name ?? describe(alert)}
            </p>

            {alert.name && (
              <p className="mt-0.5 text-sm text-stone-500">{describe(alert)}</p>
            )}

            <p className="mt-2 text-2xs text-stone-500">
              {alert.isActive
                ? 'Aktiv — uyğun elan yerləşəndə bildiriş gələcək.'
                : 'Dayandırılıb — bildiriş göndərilmir.'}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <Button
              size="sm"
              variant={alert.isActive ? 'secondary' : 'tertiary'}
              loading={busyId === alert.id}
              onClick={() => toggle(alert)}
            >
              {alert.isActive ? (
                <BellRing className="size-4" aria-hidden />
              ) : (
                <BellOff className="size-4" aria-hidden />
              )}
              {alert.isActive ? 'Aktiv' : 'Dayanıb'}
            </Button>

            <IconButton
              label="Bildirişi sil"
              onClick={() => remove(alert.id)}
              className="text-stone-500 hover:text-danger-600"
            >
              <Trash2 className="size-4" aria-hidden />
            </IconButton>
          </div>
        </Card>
      ))}

      <Panel className="mt-2 p-4">
        <p className="text-sm leading-relaxed text-stone-600">
          Yeni bildiriş yaratmaq üçün{' '}
          <Link href="/axtaris" className="font-semibold text-sprout-600 hover:underline">
            axtarış səhifəsində
          </Link>{' '}
          filtrləri seç və nəticənin altındakı düyməyə bas. Ən çox 10 axtarış saxlaya
          bilərsən.
        </p>
      </Panel>
    </div>
  );
}

/**
 * Filtri insan dilinə çevirir.
 * "Bakı · Nərimanov · 250 – 350 AZN · tələbələr üçün" kimi oxunur —
 * istifadəçi öz saxladığı axtarışı adsız da tanıya bilsin.
 */
function describe(alert: SearchAlertRow): string {
  const parts: string[] = [];

  if (alert.city) parts.push(alert.city.name);
  if (alert.district) parts.push(alert.district.name);
  if (alert.university) parts.push(alert.university.shortName ?? alert.university.name);

  if (alert.priceMin !== null && alert.priceMax !== null) {
    parts.push(formatBudgetRange(alert.priceMin, alert.priceMax));
  } else if (alert.priceMax !== null) {
    parts.push(`${formatPrice(alert.priceMax)}-ə qədər`);
  } else if (alert.priceMin !== null) {
    parts.push(`${formatPrice(alert.priceMin)}-dən yuxarı`);
  }

  if (alert.roomCount !== null) parts.push(`${alert.roomCount} otaq`);
  if (alert.studentOnly) parts.push('tələbələr üçün');

  return parts.length > 0 ? parts.join(' · ') : 'Bütün elanlar';
}
