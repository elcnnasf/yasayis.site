'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import { Info, Pencil, Search, UserRound, Users } from 'lucide-react';
import {
  formatBudgetRange,
  toManat,
  toQepik,
  type DistrictDto,
  type JointSearchDto,
  type ListingSummaryDto,
  type PagedResult,
} from '@yasayis/shared';
import { api, ApiRequestError } from '@/lib/api-client';
import { NoListingsFound } from '@/components/empty/empty-state';
import { ListingCard } from '@/components/listing/listing-card';
import { Button } from '@/components/ui/button';
import { ListingCardSkeleton, Panel, Skeleton, Well } from '@/components/ui/card';
import { ChipGroup, Field, Input } from '@/components/ui/field';

/**
 * "Birlikdə ev axtar"  (PROMPT E3)
 *
 * Ekranın məntiqi sadədir və bir ekrana sığır:
 *   1. Kim + kim (adlar və şəkillər)
 *   2. Birgə şərtlər — büdcə, otaq sayı, rayonlar
 *   3. Həmin şərtlərə uyğun elanlar
 *
 * Şərtlər əvvəlcədən iki profildən avtomatik doldurulur — istifadəçi heç nə
 * yazmadan nəticə görür. Redaktə istəyə bağlıdır, məcburi addım deyil.
 */
export function JointSearch({ matchId }: { matchId: string }) {
  const [profile, setProfile] = useState<JointSearchDto | null>(null);
  const [listings, setListings] = useState<PagedResult<ListingSummaryDto> | null>(null);
  const [districts, setDistricts] = useState<DistrictDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [listingsLoading, setListingsLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [draft, setDraft] = useState({ budgetMin: '', budgetMax: '', roomCount: '2' });
  const [draftDistricts, setDraftDistricts] = useState<string[]>([]);

  const loadListings = useCallback(() => {
    setListingsLoading(true);
    api
      .get<PagedResult<ListingSummaryDto>>(
        `/roommates/matches/${matchId}/joint-search/listings`,
      )
      .then(setListings)
      .catch(() => setListings(null))
      .finally(() => setListingsLoading(false));
  }, [matchId]);

  useEffect(() => {
    api
      .get<JointSearchDto>(`/roommates/matches/${matchId}/joint-search`)
      .then((res) => {
        setProfile(res);
        setDraft({
          budgetMin: String(toManat(res.budgetMin)),
          budgetMax: String(toManat(res.budgetMax)),
          roomCount: String(res.roomCount),
        });
        setDraftDistricts(res.districtIds);
        if (res.cityId) {
          api
            .get<DistrictDto[]>('/taxonomy/districts', { cityId: res.cityId })
            .then(setDistricts)
            .catch(() => setDistricts([]));
        }
      })
      .catch((e: unknown) => {
        setError(
          e instanceof ApiRequestError
            ? e.message
            : 'Birgə axtarış profili yüklənmədi.',
        );
      })
      .finally(() => setLoading(false));

    loadListings();
  }, [matchId, loadListings]);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const updated = await api.patch<JointSearchDto>(
        `/roommates/matches/${matchId}/joint-search`,
        {
          budgetMin: toQepik(Number(draft.budgetMin)),
          budgetMax: toQepik(Number(draft.budgetMax)),
          roomCount: Number(draft.roomCount),
          districtIds: draftDistricts,
          studentsOnly: profile?.studentsOnly ?? true,
        },
      );
      setProfile(updated);
      setEditing(false);
      loadListings();
    } catch (e) {
      setError(
        e instanceof ApiRequestError ? (e.fieldError('budgetMax') ?? e.message) : 'Saxlanmadı.',
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Skeleton className="h-64" />;

  if (!profile) {
    return (
      <Well className="flex items-start gap-2.5">
        <Info className="mt-0.5 size-4 shrink-0 text-stone-500" aria-hidden />
        <p className="text-sm text-stone-700">
          {error ?? 'Birgə axtarış üçün əvvəlcə hər iki tərəf uyğunlaşmanı qəbul etməlidir.'}
        </p>
      </Well>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* --- Kim + kim --- */}
      <Panel className="p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex -space-x-3">
              {profile.members.map((m) => (
                <span
                  key={m.userId}
                  className="relative size-12 overflow-hidden rounded-full border-2 border-white bg-stone-100"
                >
                  {m.avatarUrl ? (
                    <Image src={m.avatarUrl} alt="" fill sizes="48px" className="object-cover" />
                  ) : (
                    <span className="flex h-full items-center justify-center text-stone-400">
                      <UserRound className="size-5" strokeWidth={1.5} aria-hidden />
                    </span>
                  )}
                </span>
              ))}
            </div>

            <div className="min-w-0">
              <p className="flex items-center gap-2 text-h3 text-stone-900">
                <Users className="size-4 shrink-0 text-forest-600" aria-hidden />
                {profile.title}
              </p>
              <p className="mt-0.5 text-sm text-stone-600">Birlikdə ev axtarırsınız</p>
            </div>
          </div>

          {!editing && (
            <Button variant="tertiary" size="sm" onClick={() => setEditing(true)}>
              <Pencil className="size-4" aria-hidden />
              Şərtləri dəyiş
            </Button>
          )}
        </div>

        {/* --- Birgə şərtlər --- */}
        {editing ? (
          <div className="mt-5 flex flex-col gap-4 border-t border-stone-200/70 pt-5">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Birgə büdcə — min">
                {(p) => (
                  <Input
                    type="number"
                    prefix="AZN"
                    inputMode="numeric"
                    value={draft.budgetMin}
                    onChange={(e) => setDraft((d) => ({ ...d, budgetMin: e.target.value }))}
                    {...p}
                  />
                )}
              </Field>
              <Field label="Birgə büdcə — maks" error={error ?? undefined}>
                {(p) => (
                  <Input
                    type="number"
                    prefix="AZN"
                    inputMode="numeric"
                    value={draft.budgetMax}
                    onChange={(e) => setDraft((d) => ({ ...d, budgetMax: e.target.value }))}
                    {...p}
                  />
                )}
              </Field>
              <Field label="Otaq sayı">
                {(p) => (
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={10}
                    value={draft.roomCount}
                    onChange={(e) => setDraft((d) => ({ ...d, roomCount: e.target.value }))}
                    {...p}
                  />
                )}
              </Field>
            </div>

            {districts.length > 0 && (
              <ChipGroup
                legend="Rayonlar"
                options={districts.map((d) => ({ value: d.id, label: d.name }))}
                values={draftDistricts}
                onToggle={(id) =>
                  setDraftDistricts((prev) =>
                    prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
                  )
                }
              />
            )}

            <div className="flex gap-2">
              <Button size="sm" loading={saving} onClick={save}>
                Yadda saxla
              </Button>
              <Button size="sm" variant="tertiary" onClick={() => setEditing(false)}>
                Ləğv et
              </Button>
            </div>
          </div>
        ) : (
          <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-stone-200/70 pt-5 sm:grid-cols-4">
            <Fact
              label="Birgə büdcə"
              value={formatBudgetRange(profile.budgetMin, profile.budgetMax)}
            />
            <Fact label="Otaq sayı" value={`${profile.roomCount} otaq`} />
            <Fact label="Şəhər" value={profile.cityName ?? 'Fərqi yoxdur'} />
            <Fact
              label="Rayonlar"
              value={
                profile.districtNames.length > 0
                  ? profile.districtNames.join(', ')
                  : 'Bütün şəhər'
              }
            />
          </dl>
        )}

        <p className="mt-4 text-2xs leading-relaxed text-stone-500">
          Büdcə hər ikinizin profilindəki məbləğlərin cəmidir — birlikdə bir mənzil
          kirayələyəcəyiniz nəzərə alınıb. İstənilən vaxt dəyişə bilərsiniz.
        </p>
      </Panel>

      {/* --- Nəticələr --- */}
      <section>
        <h2 className="flex items-center gap-2 text-h2 text-stone-900">
          <Search className="size-5 shrink-0 text-forest-600" aria-hidden />
          Sizə uyğun elanlar
        </h2>

        {listingsLoading ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <ListingCardSkeleton key={i} />
            ))}
          </div>
        ) : !listings || listings.items.length === 0 ? (
          <NoListingsFound
            className="mt-4"
            onChangeFilters={() => setEditing(true)}
          />
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {listings.items.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-2xs uppercase tracking-wider text-stone-500">{label}</dt>
      <dd className="tabular mt-0.5 truncate text-body font-semibold text-stone-900">
        {value}
      </dd>
    </div>
  );
}
