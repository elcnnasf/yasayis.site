'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Ban, Check, ExternalLink, ShieldCheck, Trash2, X } from 'lucide-react';
import {
  auditActionLabels,
  formatDate,
  formatPrice,
  listingStatusLabels,
  reportReasonLabels,
  reportStatusLabels,
  ReportTarget,
  type AdminListingRowDto,
  type AdminUserDto,
  type AuditEntryDto,
  type PagedResult,
  type ReportDto,
} from '@yasayis/shared';
import { api, ApiRequestError } from '@/lib/api-client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Panel, Skeleton, Well } from '@/components/ui/card';
import { Input, Select } from '@/components/ui/field';
import { cn } from '@/lib/cn';

/**
 * Admin cədvəlləri  (PROMPT G2)
 *
 * Hər dəyişdirici əməliyyat səbəb tələb edir və audit jurnalına düşür.
 * Səbəbi könüllü etmək jurnalı mənasızlaşdırardı — sonradan "niyə bloklandı"
 * sualına cavab tapılmazdı.
 */

// ===========================================================================
//  Elanlar
// ===========================================================================

export function AdminListings() {
  const [data, setData] = useState<PagedResult<AdminListingRowDto> | null>(null);
  // Standart filtr AKTİV elanlardır. Əvvəl `PENDING` idi, çünki moderasiya
  // öncədən aparılırdı və admin işi növbədən başlayırdı. İndi elan avtomatik
  // dərc olunur — admin canlı elanlara baxır və lazım gələni dayandırır.
  const [status, setStatus] = useState('ACTIVE');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    api
      .get<PagedResult<AdminListingRowDto>>('/admin/listings', {
        status: status || undefined,
      })
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [status]);

  useEffect(load, [load]);

  const act = async (
    listing: AdminListingRowDto,
    action: 'APPROVE' | 'REJECT' | 'SUSPEND' | 'DELETE',
  ) => {
    let reason: string | null = null;

    if (action !== 'APPROVE') {
      reason = window.prompt(
        action === 'DELETE'
          ? 'Silmə səbəbi (audit jurnalına düşəcək):'
          : 'Səbəb (elan sahibinə göstəriləcək):',
      );
      if (!reason?.trim()) return;
    }

    setBusyId(listing.id);
    setNotice(null);

    try {
      if (action === 'DELETE') {
        await api.delete(`/admin/listings/${listing.id}`, { body: { reason } });
      } else {
        await api.post(`/listings/${listing.id}/moderate`, { action, reason });
      }
      load();
    } catch (e) {
      setNotice(e instanceof ApiRequestError ? e.message : 'Əməliyyat alınmadı.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Select
          aria-label="Status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="h-9 w-auto text-sm"
        >
          <option value="">Hamısı</option>
          {Object.entries(listingStatusLabels).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </Select>
        {data && (
          <span className="tabular text-sm text-stone-600">{data.total} elan</span>
        )}
      </div>

      {notice && <Well className="text-sm text-danger-600">{notice}</Well>}

      {loading ? (
        <Skeleton className="h-64" />
      ) : !data || data.items.length === 0 ? (
        <Well className="text-sm text-stone-600">Bu statusda elan yoxdur.</Well>
      ) : (
        <div className="flex flex-col gap-2">
          {data.items.map((l) => (
            <Panel key={l.id} className="flex flex-wrap items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/elan/${l.slug}`}
                    target="_blank"
                    className="min-w-0 truncate text-body font-semibold text-stone-900 hover:text-forest-600"
                  >
                    {l.title}
                  </Link>
                  <ExternalLink className="size-3 shrink-0 text-stone-400" aria-hidden />
                  <StatusBadge status={l.status} />
                  {l.reportCount > 0 && (
                    <Badge tone="danger">{l.reportCount} şikayət</Badge>
                  )}
                  {l.imageCount === 0 && <Badge tone="warning">Şəkilsiz</Badge>}
                </div>
                <p className="tabular mt-0.5 text-sm text-stone-500">
                  {l.cityName} · {formatPrice(l.price)} · {l.ownerName} ·{' '}
                  {formatDate(l.createdAt)}
                </p>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {l.status === 'PENDING' && (
                  <Button
                    size="sm"
                    loading={busyId === l.id}
                    onClick={() => act(l, 'APPROVE')}
                  >
                    <Check className="size-4" aria-hidden />
                    Təsdiqlə
                  </Button>
                )}
                {l.status === 'PENDING' && (
                  <Button
                    size="sm"
                    variant="tertiary"
                    loading={busyId === l.id}
                    onClick={() => act(l, 'REJECT')}
                  >
                    <X className="size-4" aria-hidden />
                    Rədd et
                  </Button>
                )}
                {l.status === 'ACTIVE' && (
                  <Button
                    size="sm"
                    variant="tertiary"
                    loading={busyId === l.id}
                    onClick={() => act(l, 'SUSPEND')}
                  >
                    <Ban className="size-4" aria-hidden />
                    Dayandır
                  </Button>
                )}
                {/* Dayandırılmış elanı yalnız admin geri qaytara bilər. */}
                {l.status === 'SUSPENDED' && (
                  <Button
                    size="sm"
                    loading={busyId === l.id}
                    onClick={() => act(l, 'APPROVE')}
                  >
                    <Check className="size-4" aria-hidden />
                    Bərpa et
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="danger"
                  loading={busyId === l.id}
                  onClick={() => act(l, 'DELETE')}
                >
                  <Trash2 className="size-4" aria-hidden />
                  Sil
                </Button>
              </div>
            </Panel>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: AdminListingRowDto['status'] }) {
  const tone =
    status === 'ACTIVE'
      ? 'accent'
      : status === 'PENDING'
        ? 'warning'
        : status === 'REJECTED' || status === 'SUSPENDED'
          ? 'danger'
          : 'neutral';
  return <Badge tone={tone}>{listingStatusLabels[status]}</Badge>;
}

// ===========================================================================
//  İstifadəçilər
// ===========================================================================

export function AdminUsers() {
  const [data, setData] = useState<PagedResult<AdminUserDto> | null>(null);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    api
      .get<PagedResult<AdminUserDto>>('/admin/users', {
        q: q.length >= 2 ? q : undefined,
      })
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [q]);

  useEffect(() => {
    const timer = setTimeout(load, 300);
    return () => clearTimeout(timer);
  }, [load]);

  const toggleSuspend = async (user: AdminUserDto) => {
    const suspend = user.status !== 'SUSPENDED';
    let reason: string | null = null;

    if (suspend) {
      reason = window.prompt('Bloklama səbəbi (audit jurnalına düşəcək):');
      if (!reason?.trim()) return;
    }

    setBusyId(user.id);
    setNotice(null);

    try {
      await api.post(`/admin/users/${user.id}/suspend`, { suspend, reason });
      load();
    } catch (e) {
      setNotice(e instanceof ApiRequestError ? e.message : 'Əməliyyat alınmadı.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Ad, e-poçt və ya telefon"
          className="h-9 max-w-xs text-sm"
        />
        {data && (
          <span className="tabular text-sm text-stone-600">{data.total} istifadəçi</span>
        )}
      </div>

      {notice && <Well className="text-sm text-danger-600">{notice}</Well>}

      {loading ? (
        <Skeleton className="h-64" />
      ) : !data || data.items.length === 0 ? (
        <Well className="text-sm text-stone-600">İstifadəçi tapılmadı.</Well>
      ) : (
        <div className="flex flex-col gap-2">
          {data.items.map((u) => (
            <Panel key={u.id} className="flex flex-wrap items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="min-w-0 truncate text-body font-semibold text-stone-900">
                    {u.fullName}
                  </span>
                  {u.isStudent && <Badge tone="accent" size="sm">Tələbə</Badge>}
                  {u.isOwner && <Badge tone="accent" size="sm">Ev sahibi</Badge>}
                  {u.isAdmin && <Badge tone="brand" size="sm">Admin</Badge>}
                  {u.status === 'SUSPENDED' && <Badge tone="danger">Bloklanıb</Badge>}
                  {u.phoneVerified && (
                    <ShieldCheck className="size-3.5 text-sprout-600" aria-label="Telefon təsdiqlənib" />
                  )}
                  {u.reportCount > 0 && (
                    <Badge tone="danger">{u.reportCount} şikayət</Badge>
                  )}
                </div>
                <p className="mt-0.5 truncate text-sm text-stone-500">
                  {u.email ?? u.phone ?? '—'} · {u.listingCount} elan ·{' '}
                  {formatDate(u.createdAt)}
                </p>
              </div>

              {!u.isAdmin && (
                <Button
                  size="sm"
                  variant={u.status === 'SUSPENDED' ? 'tertiary' : 'danger'}
                  loading={busyId === u.id}
                  onClick={() => toggleSuspend(u)}
                >
                  <Ban className="size-4" aria-hidden />
                  {u.status === 'SUSPENDED' ? 'Bloku aç' : 'Blokla'}
                </Button>
              )}
            </Panel>
          ))}
        </div>
      )}
    </div>
  );
}

// ===========================================================================
//  Şikayətlər
// ===========================================================================

export function AdminReports() {
  const [items, setItems] = useState<ReportDto[]>([]);
  const [status, setStatus] = useState('OPEN');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    api
      .get<ReportDto[]>('/admin/reports', { status: status || undefined })
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [status]);

  useEffect(load, [load]);

  const resolve = async (report: ReportDto, next: 'RESOLVED' | 'DISMISSED') => {
    const note = window.prompt(
      next === 'RESOLVED' ? 'Hansı tədbir görüldü?' : 'Niyə rədd edilir?',
    );
    if (note === null) return;

    setBusyId(report.id);
    try {
      await api.patch(`/admin/reports/${report.id}`, {
        status: next,
        resolutionNote: note || undefined,
      });
      load();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Select
          aria-label="Status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="h-9 w-auto text-sm"
        >
          <option value="">Hamısı</option>
          {Object.entries(reportStatusLabels).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </Select>
        <span className="tabular text-sm text-stone-600">{items.length} şikayət</span>
      </div>

      {loading ? (
        <Skeleton className="h-64" />
      ) : items.length === 0 ? (
        <Well className="text-sm text-stone-600">Bu statusda şikayət yoxdur.</Well>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((r) => (
            <Panel key={r.id} className="flex flex-wrap items-start gap-3 p-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={r.targetType === ReportTarget.LISTING ? 'neutral' : 'warning'}>
                    {r.targetType === ReportTarget.LISTING ? 'Elan' : 'İstifadəçi'}
                  </Badge>
                  {r.targetSlug ? (
                    <Link
                      href={`/elan/${r.targetSlug}`}
                      target="_blank"
                      className="min-w-0 truncate text-body font-semibold text-stone-900 hover:text-forest-600"
                    >
                      {r.targetLabel ?? r.targetId}
                    </Link>
                  ) : (
                    <span className="min-w-0 truncate text-body font-semibold text-stone-900">
                      {r.targetLabel ?? r.targetId}
                    </span>
                  )}
                  <Badge tone="danger">{reportReasonLabels[r.reason]}</Badge>
                </div>

                {r.comment && (
                  <p className="mt-1.5 text-sm leading-relaxed text-stone-700">
                    “{r.comment}”
                  </p>
                )}
                <p className="mt-1 text-2xs text-stone-500">
                  {r.reporter.fullName} · {formatDate(r.createdAt)}
                  {r.resolutionNote && ` · Nəticə: ${r.resolutionNote}`}
                </p>
              </div>

              {(r.status === 'OPEN' || r.status === 'REVIEWING') && (
                <div className="flex gap-1.5">
                  <Button
                    size="sm"
                    loading={busyId === r.id}
                    onClick={() => resolve(r, 'RESOLVED')}
                  >
                    <Check className="size-4" aria-hidden />
                    Həll et
                  </Button>
                  <Button
                    size="sm"
                    variant="tertiary"
                    loading={busyId === r.id}
                    onClick={() => resolve(r, 'DISMISSED')}
                  >
                    Rədd et
                  </Button>
                </div>
              )}
            </Panel>
          ))}
        </div>
      )}
    </div>
  );
}

// ===========================================================================
//  Audit jurnalı
// ===========================================================================

export function AdminAudit() {
  const [data, setData] = useState<{ items: AuditEntryDto[]; total: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<{ items: AuditEntryDto[]; total: number }>('/admin/audit', { limit: 50 })
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Skeleton className="h-64" />;
  if (!data || data.items.length === 0) {
    return <Well className="text-sm text-stone-600">Hələ heç bir əməliyyat yoxdur.</Well>;
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="tabular text-sm text-stone-600">{data.total} qeyd</p>
      <Panel className="divide-y divide-stone-200/70">
        {data.items.map((entry) => (
          <div key={entry.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-4 py-3">
            <span className="text-body font-medium text-stone-900">
              {entry.actor?.fullName ?? 'Sistem'}
            </span>
            <span className="text-body text-stone-700">
              {auditActionLabels[entry.action] ?? entry.action}
            </span>
            <code className="text-2xs text-stone-500">
              {entry.entityType}/{entry.entityId.slice(0, 8)}
            </code>
            <span className="ml-auto shrink-0 text-2xs text-stone-400">
              {new Date(entry.createdAt).toLocaleString('az-AZ')}
            </span>
            {entry.meta?.reason ? (
              <p className="w-full text-2xs text-stone-500">
                Səbəb: {String(entry.meta.reason)}
              </p>
            ) : null}
          </div>
        ))}
      </Panel>
    </div>
  );
}

/** Tab başlıqları — ortaq stil. */
export function AdminTabs<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: T; label: string; badge?: number }[];
  active: T;
  onChange: (id: T) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Admin bölmələri"
      className="flex gap-1 overflow-x-auto rounded-[var(--radius-input)] bg-stone-100 p-1 ring-1 ring-stone-200/70"
    >
      {tabs.map((t) => {
        const isActive = active === t.id;
        return (
          <button
            key={t.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(t.id)}
            className={cn(
              'flex shrink-0 items-center gap-2 rounded-[0.55rem] px-3.5 py-2 text-sm font-semibold transition-colors',
              isActive
                ? 'bg-white text-forest-700 shadow-[var(--shadow-xs)] ring-1 ring-stone-200/70'
                : 'text-stone-600 hover:text-forest-700',
            )}
          >
            {t.label}
            {t.badge !== undefined && t.badge > 0 && (
              <span
                className={cn(
                  'tabular rounded-full px-1.5 text-2xs',
                  isActive ? 'bg-white/20' : 'bg-warning-50 text-warning-600',
                )}
              >
                {t.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
