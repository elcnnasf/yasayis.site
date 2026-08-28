'use client';

import { useEffect, useState } from 'react';
import { Heart, Home, Users } from 'lucide-react';
import { FavoriteTarget, type FavoritesDto } from '@yasayis/shared';
import { api, ApiRequestError } from '@/lib/api-client';
import { NoSavedItems } from '@/components/empty/empty-state';
import { ListingCard } from '@/components/listing/listing-card';
import { RoommateCard } from '@/components/roommate/roommate-card';
import { ButtonLink } from '@/components/ui/button';
import { ListingCardSkeleton, Panel } from '@/components/ui/card';
import { cn } from '@/lib/cn';

/**
 * Saxlanılanlar səhifəsi  (PROMPT F1)
 *
 * Elanlar və otaq yoldaşı profilləri iki ayrı bölmədədir — bir siyahıda
 * qarışdırmaq müqayisəni çətinləşdirir, çünki kartların məzmunu tamamilə fərqlidir.
 * Aktiv bölmə URL-də saxlanılmır: səhifə qısadır və istifadəçi buraya
 * naviqasiyadan gəlir, dərin linkə ehtiyac yoxdur.
 */

type Tab = 'listings' | 'roommates';

export function SavedItems() {
  const [data, setData] = useState<FavoritesDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [tab, setTab] = useState<Tab>('listings');

  useEffect(() => {
    let cancelled = false;

    api
      .get<FavoritesDto>('/favorites')
      .then((res) => {
        if (cancelled) return;
        setData(res);
        // Elan bölməsi boş, profil bölməsi doludursa, dolu bölmə açılır.
        if (res.counts.listings === 0 && res.counts.roommates > 0) setTab('roommates');
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        if (e instanceof ApiRequestError && e.status === 401) setNeedsAuth(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const remove = async (targetType: FavoriteTarget, targetId: string) => {
    await api.delete(`/favorites/${targetType}/${targetId}`).catch(() => undefined);
    setData((d) => {
      if (!d) return d;
      const listings =
        targetType === FavoriteTarget.LISTING
          ? d.listings.filter((l) => l.id !== targetId)
          : d.listings;
      const roommates =
        targetType === FavoriteTarget.ROOMMATE
          ? d.roommates.filter((r) => r.userId !== targetId)
          : d.roommates;
      return {
        listings,
        roommates,
        counts: { listings: listings.length, roommates: roommates.length },
      };
    });
  };

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <ListingCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (needsAuth) {
    return (
      <Panel className="flex flex-col items-center px-6 py-14 text-center">
        <span
          aria-hidden
          className="grid size-14 place-items-center rounded-full bg-sprout-100 text-forest-600"
        >
          <Heart className="size-6" strokeWidth={1.75} />
        </span>
        <h1 className="mt-5 text-h3 text-stone-900">Saxlanılanları görmək üçün daxil ol</h1>
        <p className="mt-2 max-w-sm text-body text-stone-600">
          Bəyəndiyin elanlar və profillər hesabına bağlanır — istənilən cihazdan
          eyni siyahını görürsən.
        </p>
        <div className="mt-6 flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <ButtonLink href="/giris">Daxil ol</ButtonLink>
          <ButtonLink href="/axtaris" variant="tertiary">
            Elanlara bax
          </ButtonLink>
        </div>
      </Panel>
    );
  }

  const total = (data?.counts.listings ?? 0) + (data?.counts.roommates ?? 0);
  if (!data || total === 0) return <NoSavedItems />;

  const tabs: { id: Tab; label: string; icon: typeof Home; count: number }[] = [
    { id: 'listings', label: 'Elanlar', icon: Home, count: data.counts.listings },
    { id: 'roommates', label: 'Otaq yoldaşları', icon: Users, count: data.counts.roommates },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div
        role="tablist"
        aria-label="Saxlanılanlar"
        className="flex gap-1 rounded-[var(--radius-input)] bg-stone-100 p-1 ring-1 ring-stone-200/70"
      >
        {tabs.map((t) => {
          const active = tab === t.id;
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t.id)}
              className={cn(
                'flex flex-1 items-center justify-center gap-2 rounded-[0.55rem] px-3 py-2.5 text-body font-semibold transition-colors',
                active
                  ? 'bg-white text-forest-700 shadow-[var(--shadow-xs)] ring-1 ring-stone-200/70'
                  : 'text-stone-600 hover:text-forest-700',
              )}
            >
              <Icon className="size-4 shrink-0" aria-hidden />
              {t.label}
              <span
                className={cn(
                  'tabular rounded-full px-1.5 text-2xs',
                  active ? 'bg-white/20' : 'bg-stone-200 text-stone-600',
                )}
              >
                {t.count}
              </span>
            </button>
          );
        })}
      </div>

      {tab === 'listings' &&
        (data.listings.length === 0 ? (
          <EmptySection
            icon={Home}
            text="Hələ elan saxlamamısınız."
            href="/axtaris"
            cta="Elanlara bax"
          />
        ) : (
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
            {data.listings.map((listing) => (
              <div key={listing.id} className="flex flex-col gap-2">
                <ListingCard listing={listing} />
                <RemoveButton
                  onClick={() => remove(FavoriteTarget.LISTING, listing.id)}
                />
              </div>
            ))}
          </div>
        ))}

      {tab === 'roommates' &&
        (data.roommates.length === 0 ? (
          <EmptySection
            icon={Users}
            text="Hələ profil saxlamamısınız."
            href="/otaq-yoldasi"
            cta="Otaq yoldaşlarına bax"
          />
        ) : (
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
            {data.roommates.map((person) => (
              <div key={person.userId} className="flex flex-col gap-2">
                <RoommateCard person={person} />
                <RemoveButton
                  onClick={() => remove(FavoriteTarget.ROOMMATE, person.userId)}
                />
              </div>
            ))}
          </div>
        ))}
    </div>
  );
}

function RemoveButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center justify-center gap-1.5 text-sm text-stone-500 underline-offset-4 hover:text-danger-600 hover:underline"
    >
      <Heart className="size-3.5 fill-current" aria-hidden />
      Saxlanılanlardan çıxar
    </button>
  );
}

function EmptySection({
  icon: Icon,
  text,
  href,
  cta,
}: {
  icon: typeof Home;
  text: string;
  href: string;
  cta: string;
}) {
  return (
    <Panel className="flex flex-col items-center px-6 py-12 text-center">
      <span
        aria-hidden
        className="grid size-12 place-items-center rounded-full bg-sprout-100 text-forest-600"
      >
        <Icon className="size-5" strokeWidth={1.75} />
      </span>
      <p className="mt-4 text-body text-stone-700">{text}</p>
      <ButtonLink href={href} size="sm" variant="tertiary" className="mt-4">
        {cta}
      </ButtonLink>
    </Panel>
  );
}
