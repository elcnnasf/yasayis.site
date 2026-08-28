'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import {
  AlertTriangle,
  BedDouble,
  Check,
  Cigarette,
  DoorOpen,
  Eye,
  GraduationCap,
  MapPin,
  PawPrint,
  Users,
  UserRound,
  Wallet,
  X,
  SearchX,
} from 'lucide-react';
import {
  amenityLabels,
  Amenity,
  formatDate,
  formatMonthlyPrice,
  formatPrice,
  guestRuleLabels,
  smokingRuleLabels,
  type ListingDetailDto,
  type SessionUserDto,
} from '@yasayis/shared';
import { api } from '@/lib/api-client';
import { EmptyState } from '@/components/empty/empty-state';
import { Badge, VerifiedBadge } from '@/components/ui/badge';
import { ButtonLink } from '@/components/ui/button';
import { Panel, Skeleton, Well } from '@/components/ui/card';
import { ListingActions } from './listing-actions';
import { ListingGallery } from './listing-gallery';
import { rememberListing } from '@/lib/recently-viewed';
import { cn } from '@/lib/cn';

/**
 * Elan detal səhifəsi.
 *
 * Təhlükəsizlik banneri həm yuxarıda (əlaqə düymələrinin yanında), həm də
 * səhifənin sonunda görünür — istifadəçi uzun səhifəni sona qədər oxuyub
 * əlaqəyə keçəndə xəbərdarlığı yenidən görməlidir.
 */
export function ListingDetail({ slug }: { slug: string }) {
  const [listing, setListing] = useState<ListingDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  /** Sessiyadakı istifadəçinin id-si — elanın sahibi olub-olmadığını bilmək üçün. */
  const [viewerId, setViewerId] = useState<string | null>(null);

  /*
    Sessiya ayrıca yoxlanılır, çünki nömrə artıq elan cavabında gəlmir.
    Qonağa söndürülü düymə + izah göstərmək, işlək düymə göstərib klikdən
    sonra "daxil olun" xətası verməkdən yaxşıdır.
  */
  useEffect(() => {
    let cancelled = false;

    api
      .get<SessionUserDto>('/auth/me')
      .then((user) => {
        if (cancelled) return;
        setIsAuthenticated(true);
        setViewerId(user.id);
      })
      .catch(() => {
        if (cancelled) return;
        setIsAuthenticated(false);
        setViewerId(null);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    api
      .get<ListingDetailDto>(`/listings/${slug}`)
      .then((res) => {
        if (cancelled) return;
        setListing(res);
        // "Son baxdıqların" siyahısı yalnız bu cihazda saxlanılır.
        rememberListing({
          slug: res.slug,
          title: res.title,
          price: res.price,
          cityName: res.cityName,
          districtName: res.districtName,
          coverImageUrl: res.coverImageUrl,
        });
      })
      .catch(() => {
        // Uydurma elan GÖSTƏRİLMİR: `listing` null qalır və istifadəçi
        // "Elan tapılmadı" ekranını görür. Real kimi oxunan nümunə elan adamı
        // mövcud olmayan mənzilə görə plan qurmağa vadar edir.
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (loading) return <DetailSkeleton />;

  // Əvvəl burada `return null` idi — elan silinəndə və ya ünvan səhv olanda
  // istifadəçi tam BOŞ səhifə görürdü: nə izah, nə də irəli yol.
  if (!listing) {
    return (
      <EmptyState
        icon={SearchX}
        title="Elan tapılmadı."
        description="Elan silinmiş, müddəti bitmiş və ya ünvan səhv yazılmış ola bilər."
        actions={
          <>
            <ButtonLink href="/axtaris">Digər elanlara bax</ButtonLink>
            <ButtonLink href="/" variant="tertiary">
              Ana səhifə
            </ButtonLink>
          </>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <ListingGallery images={listing.images} title={listing.title} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <div className="flex flex-col gap-6">
          <Header listing={listing} />
          <RoomInfo listing={listing} />
          {listing.description && <Description text={listing.description} />}
          <HouseRules listing={listing} />
          {listing.amenities.length > 0 && <Amenities amenities={listing.amenities} />}
          {listing.nearbyUniversities.length > 0 && <Proximity listing={listing} />}
          <LocationSection listing={listing} isOwner={viewerId === listing.owner.id} />
          <Owner listing={listing} />
        </div>

        {/* Yan sütun desktopda yapışqan qalır — uzun səhifədə CTA həmişə əlçatan. */}
        <aside className="flex flex-col gap-4 lg:sticky lg:top-20">
          <Panel className="flex flex-col gap-4 p-5">
            <div>
              <p className="tabular font-display text-h1 text-forest-800">
                {formatMonthlyPrice(listing.price)}
              </p>
              <p className="mt-1 text-sm text-stone-600">
                {listing.utilitiesIncluded ? 'Kommunal xərclər daxildir' : 'Kommunal ayrıca'}
                {listing.deposit
                  ? ` · Depozit ${formatPrice(listing.deposit)}`
                  : ' · Depozit tələb olunmur'}
              </p>
            </div>

            <SafetyBanner compact />

            <ListingActions
              canContact={isAuthenticated}
              listingId={listing.id}
              title={listing.title}
              isFavorite={listing.isFavorite}
              ownerId={listing.owner.id}
              ownerName={
                listing.owner.isCompany && listing.owner.companyName
                  ? listing.owner.companyName
                  : listing.owner.fullName
              }
              ownerHasPhone={listing.owner.hasPhone}
            />
          </Panel>
        </aside>
      </div>

      <SafetyBanner />
    </div>
  );
}

// ---------------------------------------------------------------------------

function Header({ listing }: { listing: ListingDetailDto }) {
  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {listing.suitableForStudents && (
          <Badge tone="brand" icon={GraduationCap}>
            Tələbələr üçün uyğundur
          </Badge>
        )}
        {listing.vacantRoomCount > 0 && (
          <Badge tone="accent" icon={DoorOpen}>
            {listing.vacantRoomCount} otaq boş
          </Badge>
        )}
        {listing.isMixed && <Badge tone="neutral">Qarışıq</Badge>}
      </div>

      <h1 className="mt-3 text-h1 text-stone-900">{listing.title}</h1>

      <p className="mt-2 flex items-center gap-1.5 text-body text-stone-600">
        <MapPin className="size-4 shrink-0 text-stone-400" aria-hidden />
        {listing.districtName
          ? `${listing.districtName}, ${listing.cityName}`
          : listing.cityName}
      </p>

      <p className="mt-1 flex items-center gap-1.5 text-2xs text-stone-400">
        <Eye className="size-3.5 shrink-0" aria-hidden />
        {listing.viewCount} baxış
        {listing.publishedAt && ` · ${formatDate(listing.publishedAt)}`}
      </p>
    </div>
  );
}

function RoomInfo({ listing }: { listing: ListingDetailDto }) {
  const items = [
    { icon: BedDouble, label: 'Otaq sayı', value: `${listing.roomCount} otaq` },
    { icon: DoorOpen, label: 'Boş otaq', value: `${listing.vacantRoomCount} otaq` },
    {
      icon: Users,
      label: 'Hazırda yaşayan',
      value: `${listing.currentOccupantsCount} nəfər`,
    },
    {
      icon: Wallet,
      label: 'Depozit',
      value: listing.deposit ? formatPrice(listing.deposit) : 'Yoxdur',
    },
  ];

  return (
    <Panel className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-4">
      {items.map((item) => (
        <div key={item.label}>
          <item.icon className="size-4 text-stone-400" aria-hidden />
          <p className="mt-1.5 text-2xs uppercase tracking-wider text-stone-500">
            {item.label}
          </p>
          <p className="tabular mt-0.5 text-body font-semibold text-stone-900">
            {item.value}
          </p>
        </div>
      ))}
    </Panel>
  );
}

function Description({ text }: { text: string }) {
  return (
    <section>
      <h2 className="text-h3 text-stone-900">Elan haqqında</h2>
      <p className="mt-3 whitespace-pre-line text-body leading-relaxed text-stone-700">
        {text}
      </p>
    </section>
  );
}

function HouseRules({ listing }: { listing: ListingDetailDto }) {
  const rules: { icon: typeof Cigarette; label: string; value: string; ok: boolean }[] = [
    {
      icon: Cigarette,
      label: 'Siqaret',
      value: smokingRuleLabels[listing.smokingRule],
      ok: listing.smokingRule !== 'QADAGANDIR',
    },
    {
      icon: PawPrint,
      label: 'Ev heyvanı',
      value: listing.petsAllowed ? 'İcazə verilir' : 'İcazə verilmir',
      ok: listing.petsAllowed,
    },
    {
      icon: Users,
      label: 'Qonaq',
      value: guestRuleLabels[listing.guestRules],
      ok: listing.guestRules !== 'QADAGANDIR',
    },
  ];

  return (
    <section>
      <h2 className="text-h3 text-stone-900">Ev qaydaları</h2>
      <ul className="mt-3 grid gap-2.5 sm:grid-cols-3">
        {rules.map((rule) => (
          <li
            key={rule.label}
            className="flex items-start gap-2.5 rounded-[var(--radius-input)] ring-1 ring-stone-200/70 p-3.5"
          >
            <rule.icon
              className={cn('mt-0.5 size-4 shrink-0', rule.ok ? 'text-sprout-600' : 'text-stone-400')}
              aria-hidden
            />
            <div className="min-w-0">
              <p className="text-2xs uppercase tracking-wider text-stone-500">
                {rule.label}
              </p>
              <p className="text-body text-stone-800">{rule.value}</p>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-3 flex flex-wrap gap-2">
        <Suitability ok={listing.suitableForWomen} label="Qadınlara uyğundur" />
        <Suitability ok={listing.suitableForMen} label="Kişilərə uyğundur" />
        <Suitability ok={listing.suitableForStudents} label="Tələbələrə uyğundur" />
      </div>
    </section>
  );
}

function Suitability({ ok, label }: { ok: boolean; label: string }) {
  const Icon = ok ? Check : X;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-[var(--radius-chip)] px-3 py-1.5 text-sm',
        ok ? 'bg-sprout-50 text-forest-700' : 'bg-stone-100 text-stone-500',
      )}
    >
      <Icon className="size-3.5 shrink-0" aria-hidden />
      {label}
    </span>
  );
}

function Amenities({ amenities }: { amenities: Amenity[] }) {
  return (
    <section>
      <h2 className="text-h3 text-stone-900">Ev xüsusiyyətləri</h2>
      <ul className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {amenities.map((a) => (
          <li key={a} className="flex items-center gap-2 text-body text-stone-700">
            <Check className="size-4 shrink-0 text-sprout-600" aria-hidden />
            {amenityLabels[a]}
          </li>
        ))}
      </ul>
    </section>
  );
}

function Proximity({ listing }: { listing: ListingDetailDto }) {
  return (
    <section>
      <h2 className="text-h3 text-stone-900">Universitetlərə yaxınlıq</h2>
      <ul className="mt-3 divide-y divide-stone-200/70">
        {listing.nearbyUniversities.map((u) => (
          <li key={u.universityId} className="flex items-center gap-3 py-2.5">
            <GraduationCap className="size-4 shrink-0 text-stone-400" aria-hidden />
            <span className="min-w-0 flex-1 truncate text-body text-stone-800">
              {u.universityName}
            </span>
            <Badge tone="accent" className="tabular">
              {u.minutes} dəq
            </Badge>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-2xs text-stone-500">
        Vaxtlar elan sahibi tərəfindən göstərilib — sistem marşrut hesablamır.
      </p>
    </section>
  );
}

/**
 * Yerləşmə bölməsi.
 *
 * Koordinat varsa REAL xəritə (Leaflet + OpenStreetMap) göstərilir; yoxdursa
 * əvvəlki sxematik göstərici qalır. Uydurma nöqtə göstərmirik: yanlış yerə
 * qoyulmuş işarə boş xəritədən pisdir, çünki tələbə oranı yoxlamağa gedir.
 *
 * Xəritə `dynamic(..., { ssr: false })` ilə yüklənir — Leaflet `window`-a
 * toxunur və server render zamanı çökür. Yüklənənə qədər eyni ölçüdə skelet
 * göstərilir ki, səhifə sıçramasın.
 */
const ListingMap = dynamic(
  () => import('./listing-map').then((m) => m.ListingMap),
  { ssr: false, loading: () => <div className="h-52 w-full animate-pulse bg-stone-100 sm:h-64" /> },
);

function LocationSection({
  listing,
  isOwner,
}: {
  listing: ListingDetailDto;
  isOwner: boolean;
}) {
  const hasCoords = listing.latitude !== null && listing.longitude !== null;

  return (
    <section>
      <h2 className="text-h3 text-stone-900">Yerləşmə</h2>
      <div className="mt-3 overflow-hidden rounded-[var(--radius-panel)] ring-1 ring-stone-200/70">
        {hasCoords ? (
          <ListingMap
            latitude={listing.latitude as number}
            longitude={listing.longitude as number}
            exact={isOwner}
            label={listing.districtName ?? listing.cityName}
          />
        ) : (
          <div
            className="relative flex h-44 items-center justify-center bg-stone-100"
            style={{
              backgroundImage:
                'linear-gradient(var(--color-stone-200) 1px, transparent 1px), linear-gradient(90deg, var(--color-stone-200) 1px, transparent 1px)',
              backgroundSize: '32px 32px',
            }}
            role="img"
            aria-label={`Təxmini yerləşmə: ${listing.districtName ?? listing.cityName}`}
          >
            <span className="flex items-center gap-2 rounded-[var(--radius-chip)] bg-white px-3.5 py-2 text-body font-semibold text-forest-700 shadow-[var(--shadow-card)]">
              <MapPin className="size-4" aria-hidden />
              {listing.districtName ?? listing.cityName}
            </span>
          </div>
        )}

        <p className="bg-white px-4 py-3 text-2xs leading-relaxed text-stone-500">
          {!hasCoords
            ? 'Elan sahibi xəritədə yer göstərməyib. Dəqiq ünvan əlaqə saxladıqdan sonra paylaşılır.'
            : isOwner
              ? 'Siz elanın sahibisiniz, ona görə dəqiq nöqtə göstərilir. Başqaları yalnız təxmini sahəni görür.'
              : 'Dairə təxmini sahəni göstərir — dəqiq ünvan əlaqə saxladıqdan sonra paylaşılır.'}
        </p>
      </div>
    </section>
  );
}

function Owner({ listing }: { listing: ListingDetailDto }) {
  const o = listing.owner;
  return (
    <section>
      <h2 className="text-h3 text-stone-900">Elan sahibi</h2>
      <Panel className="mt-3 flex items-center gap-4 p-5">
        <div className="relative size-14 shrink-0 overflow-hidden rounded-full bg-stone-100">
          {o.avatarUrl ? (
            <Image src={o.avatarUrl} alt="" fill sizes="56px" className="object-cover" />
          ) : (
            <span className="flex h-full items-center justify-center text-stone-400">
              <UserRound className="size-6" strokeWidth={1.5} aria-hidden />
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-body font-semibold text-stone-900">
            {o.isCompany && o.companyName ? o.companyName : o.fullName}
          </p>
          <p className="text-sm text-stone-500">
            {formatDate(o.memberSince)} tarixindən üzvdür
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {o.phoneVerified && <VerifiedBadge kind="phone" />}
            {o.ownerVerified && <VerifiedBadge kind="owner" />}
          </div>
        </div>
      </Panel>
    </section>
  );
}

/**
 * Sabit xəbərdarlıq banneri.
 * Platforma elanı yoxlayır, amma zəmanət vermir — bu fərqi gizlətmək
 * istifadəçini riskə atır, ona görə mətn birbaşadır.
 */
export function SafetyBanner({ compact }: { compact?: boolean }) {
  return (
    <Well
      className={cn(
        'flex items-start gap-2.5 border border-warning-100 bg-warning-50',
        compact && 'p-3',
      )}
    >
      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning-600" aria-hidden />
      <div className="min-w-0 text-warning-600">
        <p className={cn('font-semibold', compact ? 'text-2xs' : 'text-sm')}>
          Elan verən şəxs tərəfindən təqdim edilmişdir.
        </p>
        <p className={cn('mt-0.5 leading-relaxed', compact ? 'text-2xs' : 'text-sm')}>
          Beh və ya ödəniş etməzdən əvvəl evi şəxsən yoxlayın.
        </p>
      </div>
    </Well>
  );
}

function DetailSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="aspect-[16/10] rounded-[var(--radius-panel)]" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="h-24" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-64" />
      </div>
    </div>
  );
}
