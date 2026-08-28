'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  BellPlus,
  Clock,
  Home,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
  Users,
} from 'lucide-react';
import {
  formatMonthlyPrice,
  formatPrice,
  LookingFor,
  lookingForLabels,
  type ListingSummaryDto,
  type OwnStudentProfileDto,
  type PagedResult,
  type RoommateCardDto,
  type SessionUserDto,
} from '@yasayis/shared';
import { api } from '@/lib/api-client';
import { ListingCard } from '@/components/listing/listing-card';
import { RoommateCard } from '@/components/roommate/roommate-card';
import { ButtonLink } from '@/components/ui/button';
import { Card, ListingCardSkeleton, Panel, Skeleton, Well } from '@/components/ui/card';
import { getRecentlyViewed, type RecentListing } from '@/lib/recently-viewed';

/**
 * Giriş etmiş istifadəçi üçün ana səhifə.
 *
 * Tərtibat onboardingdə seçilən məqsədə görə dəyişir: otaq yoldaşı axtaran
 * istifadəçiyə əvvəlcə profillər, ev axtarana əvvəlcə elanlar göstərilir.
 * "Qərarsız" halında ikisi bərabər sırada gəlir — süni prioritet qoymaq
 * istifadəçini yanlış yola salardı.
 */

interface SearchAlertRow {
  id: string;
  name: string | null;
  priceMin: number | null;
  priceMax: number | null;
  roomCount: number | null;
  isActive: boolean;
  city: { name: string } | null;
  district: { name: string } | null;
  university: { shortName: string | null; name: string } | null;
}

export function UserDashboard({ user }: { user: SessionUserDto }) {
  const [profile, setProfile] = useState<OwnStudentProfileDto | null>(null);
  const [listings, setListings] = useState<ListingSummaryDto[] | null>(null);
  const [roommates, setRoommates] = useState<RoommateCardDto[] | null>(null);
  const [alerts, setAlerts] = useState<SearchAlertRow[]>([]);
  const [recent, setRecent] = useState<RecentListing[]>([]);

  useEffect(() => {
    setRecent(getRecentlyViewed());

    if (user.isStudent) {
      api
        .get<OwnStudentProfileDto>('/me/student-profile')
        .then(setProfile)
        .catch(() => setProfile(null));
    }

    api
      .get<SearchAlertRow[]>('/me/search-alerts')
      .then(setAlerts)
      .catch(() => setAlerts([]));
  }, [user.isStudent]);

  // Elanlar profildəki büdcə və şəhərə görə süzülür — "sənə uyğun" sözü
  // yalnız filtr həqiqətən tətbiq olunanda doğrudur.
  useEffect(() => {
    api
      .get<PagedResult<ListingSummaryDto>>('/listings', {
        cityId: profile?.cityId ?? undefined,
        priceMax: profile?.budgetMax ?? undefined,
        forStudents: true,
        sort: 'yeni',
        limit: 5,
      })
      .then((res) => setListings(res.items))
      .catch(() => setListings([]));
  }, [profile?.cityId, profile?.budgetMax]);

  useEffect(() => {
    if (!user.isStudent) {
      setRoommates([]);
      return;
    }
    api
      .get<{ items: RoommateCardDto[] }>('/roommates', { limit: 5 })
      .then((res) => setRoommates(res.items))
      .catch(() => setRoommates([]));
  }, [user.isStudent]);

  const goal = profile?.lookingFor ?? null;

  const listingsBlock = (
    <ListingsSection
      listings={listings}
      goal={goal}
      hasFilters={Boolean(profile?.cityId || profile?.budgetMax)}
    />
  );
  const roommatesBlock = user.isStudent ? (
    <RoommatesSection roommates={roommates} profileComplete={profile?.isComplete ?? false} />
  ) : null;

  // Məqsədə görə sıra.
  const roommateFirst = goal === LookingFor.OTAQ_YOLDASI;

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-10 px-4 py-8 sm:px-6 sm:py-10">
      <Greeting user={user} goal={goal} />

      {roommateFirst ? (
        <>
          {roommatesBlock}
          {listingsBlock}
        </>
      ) : (
        <>
          {listingsBlock}
          {roommatesBlock}
        </>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <SearchAlertsSection alerts={alerts} onRemove={(id) => setAlerts((a) => a.filter((x) => x.id !== id))} />
        <RecentSection recent={recent} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

function Greeting({
  user,
  goal,
}: {
  user: SessionUserDto;
  goal: LookingFor | null;
}) {
  return (
    <header>
      <h1 className="text-h1 text-stone-900">Bu gün nə axtarırsan?</h1>

      <div className="mt-5 flex flex-wrap gap-2">
        <ButtonLink href="/axtaris" size="md">
          <Search className="size-4" aria-hidden />
          Ev / otaq tap
        </ButtonLink>
        {user.isStudent && (
          <ButtonLink href="/otaq-yoldasi" size="md" variant="secondary">
            <Users className="size-4" aria-hidden />
            Otaq yoldaşı tap
          </ButtonLink>
        )}
        {user.isOwner && (
          <ButtonLink href="/elan/yeni" size="md" variant="tertiary">
            <Plus className="size-4" aria-hidden />
            Elan yerləşdir
          </ButtonLink>
        )}
      </div>

      {goal && goal !== LookingFor.QERARSIZ && (
        <p className="mt-3 text-sm text-stone-500">
          Profilində «{lookingForLabels[goal]}» seçmisən — səhifə buna görə sıralanıb.{' '}
          <Link href="/basla" className="font-medium text-forest-600 hover:underline">
            Dəyiş
          </Link>
        </p>
      )}
    </header>
  );
}

function ListingsSection({
  listings,
  goal,
  hasFilters,
}: {
  listings: ListingSummaryDto[] | null;
  goal: LookingFor | null;
  hasFilters: boolean;
}) {
  return (
    <section>
      <SectionHead
        title="Sənə uyğun elanlar"
        note={
          hasFilters
            ? 'Profilindəki şəhər və büdcəyə görə süzülüb.'
            : 'Profilini tamamlasan, siyahı sənə uyğunlaşacaq.'
        }
        href={goal === LookingFor.OTAQ ? '/axtaris?hasVacantRoom=true' : '/axtaris'}
      />

      {listings === null ? (
        <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <ListingCardSkeleton key={i} />
          ))}
        </div>
      ) : listings.length === 0 ? (
        <Well className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <p className="min-w-0 flex-1 text-sm text-stone-700">
            Hazırda uyğun elan yoxdur. Axtarış bildirişi yarat — uyğun elan
            yerləşən kimi xəbər verək.
          </p>
          <ButtonLink href="/axtaris" size="sm" variant="tertiary">
            Filtri genişləndir
          </ButtonLink>
        </Well>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
          {listings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      )}
    </section>
  );
}

function RoommatesSection({
  roommates,
  profileComplete,
}: {
  roommates: RoommateCardDto[] | null;
  profileComplete: boolean;
}) {
  return (
    <section>
      <SectionHead
        title="Sənə uyğun otaq yoldaşları"
        note={
          profileComplete
            ? 'Uyğunluq faizi profil cavablarınıza görə hesablanıb.'
            : 'Profil yarımçıqdır — tamamlasan faiz daha dəqiq olacaq.'
        }
        href="/otaq-yoldasi"
      />

      {roommates === null ? (
        <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      ) : roommates.length === 0 ? (
        <Well className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <p className="min-w-0 flex-1 text-sm text-stone-700">
            Hazırda uyğun profil yoxdur. Profil məlumatlarını tamamla ki,
            uyğunluq daha dəqiq hesablansın.
          </p>
          <ButtonLink href="/basla" size="sm">
            Profili tamamla
          </ButtonLink>
        </Well>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
          {roommates.map((person) => (
            <RoommateCard key={person.userId} person={person} />
          ))}
        </div>
      )}
    </section>
  );
}

function SearchAlertsSection({
  alerts,
  onRemove,
}: {
  alerts: SearchAlertRow[];
  onRemove: (id: string) => void;
}) {
  const remove = async (id: string) => {
    onRemove(id);
    await api.delete(`/me/search-alerts/${id}`).catch(() => undefined);
  };

  return (
    <section>
      <h2 className="flex items-center gap-2 text-h3 text-stone-900">
        <BellPlus className="size-4 shrink-0 text-stone-400" aria-hidden />
        Saxladığın axtarışlar
      </h2>

      {alerts.length === 0 ? (
        <Well className="mt-3 text-sm text-stone-600">
          Hələ axtarış saxlamamısan. Axtarış səhifəsində filtri qurub yadda
          saxlaya bilərsən — uyğun elan çıxanda bildiriş alacaqsan.
        </Well>
      ) : (
        <Panel className="mt-3 divide-y divide-stone-200/70">
          {alerts.map((alert) => (
            <div key={alert.id} className="flex items-center gap-3 px-4 py-3">
              <SlidersHorizontal className="size-4 shrink-0 text-stone-400" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="truncate text-body text-stone-900">
                  {alert.name ?? describeAlert(alert)}
                </p>
                {alert.name && (
                  <p className="truncate text-2xs text-stone-500">{describeAlert(alert)}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => remove(alert.id)}
                aria-label="Axtarışı sil"
                className="grid size-8 shrink-0 place-items-center rounded-md text-stone-400 transition-colors hover:bg-danger-50 hover:text-danger-600"
              >
                <Trash2 className="size-4" aria-hidden />
              </button>
            </div>
          ))}
        </Panel>
      )}
    </section>
  );
}

function RecentSection({ recent }: { recent: RecentListing[] }) {
  return (
    <section>
      <h2 className="flex items-center gap-2 text-h3 text-stone-900">
        <Clock className="size-4 shrink-0 text-stone-400" aria-hidden />
        Son baxdıqların
      </h2>

      {recent.length === 0 ? (
        <Well className="mt-3 text-sm text-stone-600">
          Hələ elana baxmamısan. Baxdıqların burada görünəcək — yalnız bu
          cihazda saxlanılır.
        </Well>
      ) : (
        <Panel className="mt-3 divide-y divide-stone-200/70">
          {recent.slice(0, 5).map((item) => (
            <Link
              key={item.slug}
              href={`/elan/${item.slug}`}
              className="flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-stone-50"
            >
              <div className="relative size-12 shrink-0 overflow-hidden rounded-[0.5rem] bg-stone-100">
                {item.coverImageUrl && (
                  <Image
                    src={item.coverImageUrl}
                    alt=""
                    fill
                    sizes="48px"
                    className="object-cover"
                  />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-body text-stone-900">{item.title}</p>
                <p className="truncate text-2xs text-stone-500">
                  {item.districtName ? `${item.districtName}, ` : ''}
                  {item.cityName}
                </p>
              </div>
              <span className="tabular shrink-0 text-sm font-semibold text-forest-600">
                {formatMonthlyPrice(item.price)}
              </span>
            </Link>
          ))}
        </Panel>
      )}
    </section>
  );
}

function SectionHead({
  title,
  note,
  href,
}: {
  title: string;
  note?: string;
  href: string;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-h2 text-stone-900">{title}</h2>
        {note && <p className="mt-1 text-sm text-stone-600">{note}</p>}
      </div>
      <Link
        href={href}
        className="flex items-center gap-1.5 text-sm font-semibold text-forest-600 hover:underline"
      >
        Hamısına bax
        <ArrowRight className="size-4" aria-hidden />
      </Link>
    </div>
  );
}

/** Adı olmayan axtarışı insan dilində təsvir edir. */
function describeAlert(alert: SearchAlertRow): string {
  const parts: string[] = [];
  if (alert.city) parts.push(alert.city.name);
  if (alert.district) parts.push(alert.district.name);
  if (alert.university) {
    parts.push(alert.university.shortName ?? alert.university.name);
  }
  if (alert.roomCount) parts.push(`${alert.roomCount} otaq`);
  if (alert.priceMax) parts.push(`${formatPrice(alert.priceMax)}-ə qədər`);
  return parts.length > 0 ? parts.join(' · ') : 'Bütün elanlar';
}

/** Ev sahibi üçün ayrıca giriş nöqtəsi — dashboard-un altında. */
export function OwnerShortcut() {
  return (
    <Card className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center">
      <Home className="size-5 shrink-0 text-forest-600" aria-hidden />
      <p className="min-w-0 flex-1 text-body text-stone-700">
        Elanlarınızı idarə etmək və statuslarını görmək üçün profil bölməsinə keçin.
      </p>
      <ButtonLink href="/profil" size="sm" variant="tertiary">
        Elanlarım
      </ButtonLink>
    </Card>
  );
}
