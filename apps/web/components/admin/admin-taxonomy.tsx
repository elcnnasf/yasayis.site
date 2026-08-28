'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import {
  slugify,
  type CityDto,
  type DistrictDto,
  type MajorDto,
  type UniversityDto,
} from '@yasayis/shared';
import { api, ApiRequestError } from '@/lib/api-client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Panel, Skeleton, Well } from '@/components/ui/card';
import { Field, Input, Select } from '@/components/ui/field';

type Kind = 'cities' | 'districts' | 'universities' | 'majors';

const KIND_LABELS: Record<Kind, string> = {
  cities: 'Şəhərlər',
  districts: 'Rayonlar',
  universities: 'Universitetlər',
  majors: 'İxtisaslar',
};

type Row = (CityDto | DistrictDto | UniversityDto | MajorDto) & {
  isOther?: boolean;
  shortName?: string | null;
};

/**
 * Taksonomiya idarəetməsi — A2-dəki CRUD API-nin admin UI qatı.
 *
 * Silmə əməliyyatı serverdə istinadları yoxlayır: bağlı elan və ya profil
 * varsa 409 qaytarır və deaktiv etmək təklif olunur. UI həmin mesajı olduğu
 * kimi göstərir — burada ayrıca qayda təkrarlanmır.
 */
export function AdminTaxonomy() {
  const [kind, setKind] = useState<Kind>('cities');
  const [rows, setRows] = useState<Row[]>([]);
  const [cities, setCities] = useState<CityDto[]>([]);
  const [cityId, setCityId] = useState('');
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [name, setName] = useState('');
  const [shortName, setShortName] = useState('');

  const needsCity = kind === 'districts' || kind === 'universities';

  const load = useCallback(() => {
    setLoading(true);
    api
      .get<Row[]>(`/admin/taxonomy/${kind}`, {
        cityId: needsCity && cityId ? cityId : undefined,
      })
      .then(setRows)
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [kind, cityId, needsCity]);

  useEffect(load, [load]);

  useEffect(() => {
    api
      .get<CityDto[]>('/admin/taxonomy/cities')
      .then(setCities)
      .catch(() => setCities([]));
  }, []);

  const create = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;

    if (kind === 'districts' && !cityId) {
      setNotice('Rayon üçün əvvəlcə şəhəri seçin.');
      return;
    }

    setBusy(true);
    setNotice(null);

    const body: Record<string, unknown> = { name: name.trim(), slug: slugify(name) };
    if (needsCity) body.cityId = cityId || null;
    if (kind === 'universities') body.shortName = shortName.trim() || null;

    try {
      await api.post(`/admin/taxonomy/${kind}`, body);
      setName('');
      setShortName('');
      load();
    } catch (err) {
      setNotice(err instanceof ApiRequestError ? err.message : 'Əlavə edilmədi.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (row: Row) => {
    if (!window.confirm(`${row.name} silinsin?`)) return;
    setNotice(null);
    try {
      await api.delete(`/admin/taxonomy/${kind}/${row.id}`);
      load();
    } catch (err) {
      setNotice(err instanceof ApiRequestError ? err.message : 'Silinmədi.');
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {(Object.keys(KIND_LABELS) as Kind[]).map((k) => (
          <Button
            key={k}
            size="sm"
            variant={kind === k ? 'primary' : 'tertiary'}
            onClick={() => setKind(k)}
          >
            {KIND_LABELS[k]}
          </Button>
        ))}
      </div>

      <Panel className="p-4">
        <form onSubmit={create} className="grid gap-3 sm:grid-cols-4">
          {needsCity && (
            <Field label="Şəhər">
              {(p) => (
                <Select value={cityId} onChange={(e) => setCityId(e.target.value)} {...p}>
                  <option value="">
                    {kind === 'universities' ? 'Hamısı' : 'Seçin'}
                  </option>
                  {cities.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          )}

          <Field label="Ad" required>
            {(p) => <Input value={name} onChange={(e) => setName(e.target.value)} {...p} />}
          </Field>

          {kind === 'universities' && (
            <Field label="Qısaltma">
              {(p) => (
                <Input
                  value={shortName}
                  onChange={(e) => setShortName(e.target.value)}
                  placeholder="BDU"
                  {...p}
                />
              )}
            </Field>
          )}

          <div className="flex items-end">
            <Button type="submit" loading={busy} fullWidth>
              <Plus className="size-4" aria-hidden />
              Əlavə et
            </Button>
          </div>
        </form>
      </Panel>

      {notice && <Well className="text-sm text-danger-600">{notice}</Well>}

      {loading ? (
        <Skeleton className="h-64" />
      ) : rows.length === 0 ? (
        <Well className="text-sm text-stone-600">Qeyd yoxdur.</Well>
      ) : (
        <Panel className="divide-y divide-stone-200/70">
          {rows.map((row) => (
            <div key={row.id} className="flex items-center gap-3 px-4 py-2.5">
              <span className="min-w-0 flex-1 truncate text-body text-stone-900">
                {row.name}
                {row.shortName && (
                  <span className="ml-2 text-sm text-stone-500">{row.shortName}</span>
                )}
              </span>
              {row.isOther && <Badge tone="neutral">Sistem qeydi</Badge>}
              {!row.isActive && <Badge tone="warning">Deaktiv</Badge>}
              {!row.isOther && (
                <button
                  type="button"
                  onClick={() => remove(row)}
                  aria-label={`${row.name} sil`}
                  className="grid size-8 shrink-0 place-items-center rounded-md text-stone-500 transition-colors hover:bg-danger-50 hover:text-danger-600"
                >
                  <Trash2 className="size-4" aria-hidden />
                </button>
              )}
            </div>
          ))}
        </Panel>
      )}
    </div>
  );
}
