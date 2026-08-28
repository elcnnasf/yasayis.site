'use client';

import { useCallback, useEffect, useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import {
  SCORE_EXPLANATION,
  toQepik,
  type CityDto,
  type RoommateCardDto,
  type UniversityDto,
} from '@yasayis/shared';
import { api, ApiRequestError } from '@/lib/api-client';
import { NoRoommatesFound } from '@/components/empty/empty-state';
import { Button } from '@/components/ui/button';
import { Panel, Skeleton } from '@/components/ui/card';
import { Field, Input, Select } from '@/components/ui/field';
import { RoommateCard } from './roommate-card';

/**
 * "Otaq yoldaşı axtaran tələbələr" səhifəsi.
 *
 * Filtrlər qəsdən azdır — şəhər, universitet və büdcə. Otaq yoldaşı seçimində
 * əsas iş uyğunluq skorundadır; onlarla filtr qoymaq istifadəçini nəticəsiz
 * dar sahəyə salır.
 */
export function RoommateDiscovery() {
  const [people, setPeople] = useState<RoommateCardDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [cityId, setCityId] = useState('');
  const [universityId, setUniversityId] = useState('');
  const [budgetMax, setBudgetMax] = useState('');

  const [cities, setCities] = useState<CityDto[]>([]);
  const [universities, setUniversities] = useState<UniversityDto[]>([]);

  useEffect(() => {
    api
      .get<CityDto[]>('/taxonomy/cities')
      .then(setCities)
      .catch(() => setCities([]));
  }, []);

  useEffect(() => {
    if (!cityId) {
      setUniversities([]);
      return;
    }
    api
      .get<UniversityDto[]>('/taxonomy/universities', { cityId })
      .then((list) => setUniversities(list.filter((u) => !u.isOther)))
      .catch(() => setUniversities([]));
  }, [cityId]);

  const load = useCallback(() => {
    setLoading(true);
    api
      .get<{ items: RoommateCardDto[] }>('/roommates', {
        cityId: cityId || undefined,
        universityId: universityId || undefined,
        budgetMax: budgetMax ? toQepik(Number(budgetMax)) : undefined,
      })
      .then((res) => {
        setPeople(res.items);
      })
      .catch(() => {
        // Uydurma profil göstərmirik: mövcud olmayan adama "əlaqə qur"
        // düyməsi təklif etmək platformanın mənasını pozur.
        setPeople([]);
      })
      .finally(() => setLoading(false));
  }, [cityId, universityId, budgetMax]);

  useEffect(load, [load]);

  const connect = async (userId: string) => {
    setBusyId(userId);
    setNotice(null);

    try {
      await api.post('/roommates/matches', { userId });
      load();
    } catch (e) {
      setNotice(
        e instanceof ApiRequestError && e.status === 401
          ? 'Əlaqə qurmaq üçün daxil olun.'
          : e instanceof ApiRequestError
            ? e.message
            : 'Sorğu göndərilmədi.',
      );
    } finally {
      setBusyId(null);
    }
  };

  const filters = (
    <div className="grid gap-3 sm:grid-cols-3">
      <Field label="Şəhər">
        {(p) => (
          <Select
            value={cityId}
            onChange={(e) => {
              setCityId(e.target.value);
              setUniversityId('');
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

      <Field label="Universitet">
        {(p) => (
          <Select
            value={universityId}
            disabled={universities.length === 0}
            onChange={(e) => setUniversityId(e.target.value)}
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

      <Field label="Maksimum büdcə">
        {(p) => (
          <Input
            type="number"
            inputMode="numeric"
            prefix="AZN"
            min={0}
            value={budgetMax}
            onChange={(e) => setBudgetMax(e.target.value)}
            placeholder="500"
            {...p}
          />
        )}
      </Field>
    </div>
  );

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-h1 text-stone-900">Otaq yoldaşı axtaran tələbələr</h1>
        <p className="mt-2 max-w-2xl text-lead text-stone-600">
          Uyğunluq faizi sizin və qarşı tərəfin profil cavablarına görə hesablanır.
        </p>
      </div>

      {/* Desktopda filtrlər açıq, mobil-də düymə ilə açılır. */}
      <Panel className="hidden p-4 sm:block">{filters}</Panel>
      <div className="sm:hidden">
        <Button variant="tertiary" fullWidth onClick={() => setFiltersOpen((v) => !v)}>
          <SlidersHorizontal className="size-4" aria-hidden />
          {filtersOpen ? 'Filtrləri gizlət' : 'Filtrlər'}
        </Button>
        {filtersOpen && <Panel className="mt-3 p-4">{filters}</Panel>}
      </div>

      {notice && (
        <p role="status" className="text-sm text-stone-600">
          {notice}
        </p>
      )}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      ) : people.length === 0 ? (
        <NoRoommatesFound />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {people.map((person) => (
              <RoommateCard
                key={person.userId}
                person={person}
                onConnect={connect}
                busy={busyId === person.userId}
              />
            ))}
          </div>

          <p className="text-center text-2xs text-stone-500">{SCORE_EXPLANATION}</p>
        </>
      )}
    </div>
  );
}
