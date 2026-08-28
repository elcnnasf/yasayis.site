'use client';

import { X } from 'lucide-react';
import {
  amenityLabels,
  Amenity,
  ownerTypeLabels,
  OWNER_TYPES,
  toManat,
  toQepik,
  type CityDto,
  type DistrictDto,
  type UniversityDto,
} from '@yasayis/shared';
import { Button } from '@/components/ui/button';
import { Checkbox, ChipGroup, Field, Input, Select } from '@/components/ui/field';
import { cn } from '@/lib/cn';
import type { Filters } from './use-filters';

const ROOM_OPTIONS = [1, 2, 3, 4, 5];

const AMENITY_OPTIONS = (Object.keys(amenityLabels) as Amenity[]).map((value) => ({
  value,
  label: amenityLabels[value],
}));

/**
 * Filtr paneli.
 *
 * Desktopda sol sütunda sabit dayanır, mobil-də aşağıdan açılan panel kimi
 * çıxır — ekranın yarısını tutan modal əvəzinə, çünki istifadəçi filtri
 * dəyişəndə nəticələrin dəyişdiyini görmək istəyir.
 */
export function FilterPanel({
  filters,
  setFilter,
  reset,
  activeCount,
  cities,
  districts,
  universities,
  open,
  onClose,
  className,
}: {
  filters: Filters;
  setFilter: <K extends keyof Filters>(key: K, value: Filters[K]) => void;
  reset: () => void;
  activeCount: number;
  cities: CityDto[];
  districts: DistrictDto[];
  universities: UniversityDto[];
  open?: boolean;
  onClose?: () => void;
  className?: string;
}) {
  const toggleRoom = (n: number) => {
    const current = filters.roomCount ?? [];
    setFilter(
      'roomCount',
      current.includes(n) ? current.filter((x) => x !== n) : [...current, n],
    );
  };

  const toggleAmenity = (a: Amenity) => {
    const current = filters.amenity ?? [];
    setFilter(
      'amenity',
      current.includes(a) ? current.filter((x) => x !== a) : [...current, a],
    );
  };

  const body = (
    <div className="flex flex-col gap-6">
      {/* --- Yer --- */}
      <Group title="Yer">
        <Field label="Şəhər">
          {(p) => (
            <Select
              value={filters.cityId ?? ''}
              onChange={(e) => {
                setFilter('cityId', e.target.value || undefined);
                setFilter('districtId', undefined);
                setFilter('universityId', undefined);
              }}
              {...p}
            >
              <option value="">Bütün şəhərlər</option>
              {cities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          )}
        </Field>

        <Field
          label="Rayon"
          hint={districts.length === 0 ? 'Əvvəlcə şəhəri seçin' : undefined}
        >
          {(p) => (
            <Select
              value={filters.districtId?.[0] ?? ''}
              disabled={districts.length === 0}
              onChange={(e) =>
                setFilter('districtId', e.target.value ? [e.target.value] : undefined)
              }
              {...p}
            >
              <option value="">Bütün rayonlar</option>
              {districts.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
          )}
        </Field>

        <Field
          label="Universitet"
          hint="Seçilən universitetə yaxın elanlar önə çıxır"
        >
          {(p) => (
            <Select
              value={filters.universityId ?? ''}
              disabled={universities.length === 0}
              onChange={(e) => setFilter('universityId', e.target.value || undefined)}
              {...p}
            >
              <option value="">Fərqi yoxdur</option>
              {universities.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.shortName ?? u.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </Group>

      {/* --- Qiymət --- */}
      <Group title="Qiymət">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Minimum">
            {(p) => (
              <Input
                type="number"
                inputMode="numeric"
                prefix="AZN"
                min={0}
                value={filters.priceMin ? String(toManat(filters.priceMin)) : ''}
                onChange={(e) =>
                  setFilter(
                    'priceMin',
                    e.target.value ? toQepik(Number(e.target.value)) : undefined,
                  )
                }
                {...p}
              />
            )}
          </Field>
          <Field label="Maksimum">
            {(p) => (
              <Input
                type="number"
                inputMode="numeric"
                prefix="AZN"
                min={0}
                value={filters.priceMax ? String(toManat(filters.priceMax)) : ''}
                onChange={(e) =>
                  setFilter(
                    'priceMax',
                    e.target.value ? toQepik(Number(e.target.value)) : undefined,
                  )
                }
                {...p}
              />
            )}
          </Field>
        </div>

        <Checkbox
          label="Depozit tələb olunmur"
          checked={filters.noDeposit ?? false}
          onChange={(e) => setFilter('noDeposit', e.target.checked || undefined)}
        />
        <Checkbox
          label="Kommunal xərclər daxildir"
          checked={filters.utilitiesIncluded ?? false}
          onChange={(e) => setFilter('utilitiesIncluded', e.target.checked || undefined)}
        />
      </Group>

      {/* --- Otaqlar --- */}
      <Group title="Otaqlar">
        <ChipGroup
          legend="Otaq sayı"
          options={ROOM_OPTIONS.map((n) => ({
            value: String(n),
            label: n === 5 ? '5+' : String(n),
          }))}
          values={(filters.roomCount ?? []).map(String)}
          onToggle={(v) => toggleRoom(Number(v))}
        />
        <Checkbox
          label="Boş otağı var"
          checked={filters.hasVacantRoom ?? false}
          onChange={(e) => setFilter('hasVacantRoom', e.target.checked || undefined)}
        />
      </Group>

      {/* --- Kimə uyğundur --- */}
      <Group title="Kimə uyğundur">
        <Checkbox
          label="Tələbələrə uyğundur"
          checked={filters.forStudents ?? false}
          onChange={(e) => setFilter('forStudents', e.target.checked || undefined)}
        />
        <Checkbox
          label="Qadınlara uyğundur"
          checked={filters.forWomen ?? false}
          onChange={(e) => setFilter('forWomen', e.target.checked || undefined)}
        />
        <Checkbox
          label="Kişilərə uyğundur"
          checked={filters.forMen ?? false}
          onChange={(e) => setFilter('forMen', e.target.checked || undefined)}
        />
      </Group>

      {/* --- Ev qaydaları --- */}
      <Group title="Ev qaydaları">
        <Checkbox
          label="Ev heyvanına icazə var"
          checked={filters.petsAllowed ?? false}
          onChange={(e) => setFilter('petsAllowed', e.target.checked || undefined)}
        />
        <Checkbox
          label="Siqaret çəkmək olar"
          checked={filters.smokingAllowed ?? false}
          onChange={(e) => setFilter('smokingAllowed', e.target.checked || undefined)}
        />
      </Group>

      {/* --- Xüsusiyyətlər --- */}
      <Group title="Ev xüsusiyyətləri">
        <ChipGroup
          legend="Seçilənlərin hamısı olmalıdır"
          options={AMENITY_OPTIONS}
          values={filters.amenity ?? []}
          onToggle={(v) => toggleAmenity(v)}
        />
      </Group>

      {/* --- Elan sahibi --- */}
      <Group title="Elan sahibi">
        <Field label="Tip">
          {(p) => (
            <Select
              value={filters.ownerType ?? ''}
              onChange={(e) =>
                setFilter(
                  'ownerType',
                  (e.target.value || undefined) as Filters['ownerType'],
                )
              }
              {...p}
            >
              <option value="">Fərqi yoxdur</option>
              <option value={OWNER_TYPES.PERSON}>{ownerTypeLabels[OWNER_TYPES.PERSON]}</option>
              <option value={OWNER_TYPES.AGENCY}>{ownerTypeLabels[OWNER_TYPES.AGENCY]}</option>
            </Select>
          )}
        </Field>
      </Group>

      {activeCount > 0 && (
        <Button variant="tertiary" fullWidth onClick={reset} type="button">
          Filterləri təmizlə ({activeCount})
        </Button>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <aside className={cn('hidden lg:block', className)}>
        <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto rounded-[var(--radius-panel)] bg-white ring-1 ring-stone-200/70 p-5">
          {body}
        </div>
      </aside>

      {/* Mobil: aşağıdan açılan panel */}
      {open && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end lg:hidden">
          <button
            type="button"
            aria-label="Filtri bağla"
            onClick={onClose}
            className="absolute inset-0 bg-stone-900/40"
          />
          <div className="relative max-h-[85vh] overflow-y-auto rounded-t-[var(--radius-panel)] bg-white p-5 pb-24">
            <div className="sticky -top-5 -mx-5 mb-4 flex items-center justify-between border-b border-stone-200/70 bg-white px-5 py-3">
              <p className="text-h3 text-stone-900">Filterlər</p>
              <button
                type="button"
                onClick={onClose}
                aria-label="Bağla"
                className="grid size-9 place-items-center rounded-full text-stone-600 hover:bg-stone-100"
              >
                <X className="size-5" aria-hidden />
              </button>
            </div>
            {body}
            <div className="pb-safe fixed inset-x-0 bottom-0 border-t border-stone-200/70 bg-white p-4">
              <Button fullWidth onClick={onClose}>
                Nəticələri göstər
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-2xs font-bold uppercase tracking-widest text-stone-500">
        {title}
      </h3>
      {children}
    </section>
  );
}
