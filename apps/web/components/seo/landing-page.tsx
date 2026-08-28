import Link from 'next/link';
import { ArrowRight, Building2, GraduationCap, MapPin, Users } from 'lucide-react';
import {
  buildSeoMeta,
  SEO_PAGE_KINDS,
  type ListingSummaryDto,
  type SeoPageKind,
  type SeoPlace,
} from '@yasayis/shared';
import { ListingCard } from '@/components/listing/listing-card';
import { ButtonLink } from '@/components/ui/button';
import { Card, Panel } from '@/components/ui/card';

/**
 * SEO landing səhifəsinin ortaq gövdəsi.
 *
 * Beş səhifə tipi (şəhər, rayon, evlər, otaq yoldaşı, tələbələr) eyni
 * komponenti işlədir — fərq yalnız mətn və filtrdədir. Ayrı-ayrı səhifə
 * yazsaydıq, biri dəyişəndə qalan dördü arxada qalardı.
 *
 * Server komponentidir: məzmun HTML-də gəlir, axtarış motoru JavaScript
 * icra etmədən görür.
 */
export function SeoLandingPage({
  kind,
  place,
  listings,
  districts,
  universities,
  siblingCities,
}: {
  kind: SeoPageKind;
  place: SeoPlace;
  listings: ListingSummaryDto[];
  districts?: { slug: string; name: string }[];
  universities?: { shortName: string | null; name: string }[];
  siblingCities?: { slug: string; name: string }[];
}) {
  const meta = buildSeoMeta(kind, place);
  const searchHref = buildSearchHref(kind, place);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      <Breadcrumbs kind={kind} place={place} />

      <header className="mt-4">
        <h1 className="text-h1 text-stone-900">{meta.h1}</h1>
        <p className="mt-2 max-w-2xl text-lead leading-relaxed text-stone-600">
          {meta.intro}
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          <ButtonLink href={searchHref}>
            <Building2 className="size-4" aria-hidden />
            Elanlara bax
          </ButtonLink>
          {kind !== SEO_PAGE_KINDS.ROOMMATES && (
            <ButtonLink
              href={`/otaq-yoldasi/${place.citySlug}`}
              variant="secondary"
            >
              <Users className="size-4" aria-hidden />
              Otaq yoldaşı tap
            </ButtonLink>
          )}
        </div>
      </header>

      {/* Rayon keçidləri — həm istifadəçi, həm daxili keçid şəbəkəsi üçün. */}
      {districts && districts.length > 0 && (
        <section className="mt-10">
          <h2 className="text-h3 text-stone-900">{place.cityName} rayonları</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {districts.map((d) => (
              <li key={d.slug}>
                <Link
                  href={`/${place.citySlug}/${d.slug}`}
                  className="inline-flex items-center rounded-[var(--radius-chip)] bg-white ring-1 ring-stone-200/70 px-3.5 py-2 text-sm font-medium text-stone-700 transition-colors hover:border-forest-600 hover:text-forest-600"
                >
                  {d.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {universities && universities.length > 0 && (
        <section className="mt-8">
          <h2 className="text-h3 text-stone-900">
            {place.cityName} universitetləri
          </h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {universities.map((u) => (
              <li
                key={u.name}
                className="inline-flex items-center gap-1.5 rounded-[var(--radius-chip)] bg-stone-100 px-3 py-1.5 text-sm text-stone-700"
              >
                <GraduationCap className="size-3.5 text-stone-400" aria-hidden />
                {u.shortName ?? u.name}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-h2 text-stone-900">
            {kind === SEO_PAGE_KINDS.ROOMMATES ? 'Son elanlar' : 'Aktual elanlar'}
          </h2>
          <Link
            href={searchHref}
            className="flex items-center gap-1.5 text-sm font-semibold text-forest-600 hover:underline"
          >
            Hamısına bax
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>

        {listings.length === 0 ? (
          <Panel className="mt-4 flex flex-col items-center gap-4 px-6 py-10 text-center sm:flex-row sm:justify-between sm:text-left">
            <div className="max-w-xl">
              <p className="text-h3 text-stone-900">
                {place.districtName ?? place.cityName} üçün hələ elan yoxdur.
              </p>
              <p className="mt-1.5 text-body leading-relaxed text-stone-600">
                Bu ərazidə platforma yeni başlayır. Elan yerləşdirsəniz,
                moderasiyadan sonra tələbələr onu dərhal görəcək.
              </p>
            </div>
            <ButtonLink href="/elan/yeni" className="shrink-0">
              Elan yerləşdir
            </ButtonLink>
          </Panel>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {listings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}
      </section>

      {/* Digər şəhərlər — keçid şəbəkəsi. */}
      {siblingCities && siblingCities.length > 0 && (
        <section className="mt-12">
          <h2 className="text-h3 text-stone-900">Digər şəhərlər</h2>
          <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
            {siblingCities.map((c) => (
              <li key={c.slug}>
                <Link href={`/${c.slug}`}>
                  <Card interactive className="flex items-center gap-2 p-3">
                    <MapPin className="size-3.5 shrink-0 text-stone-400" aria-hidden />
                    <span className="truncate text-sm text-stone-800">{c.name}</span>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Breadcrumbs({ kind, place }: { kind: SeoPageKind; place: SeoPlace }) {
  const trail: { href: string; label: string }[] = [{ href: '/', label: 'Ana səhifə' }];

  if (kind === SEO_PAGE_KINDS.HOMES) trail.push({ href: '/evler', label: 'Evlər' });
  if (kind === SEO_PAGE_KINDS.ROOMMATES) {
    trail.push({ href: '/otaq-yoldasi', label: 'Otaq yoldaşı' });
  }
  if (kind === SEO_PAGE_KINDS.STUDENTS) {
    trail.push({ href: '/telebeler', label: 'Tələbələr' });
  }

  trail.push({ href: `/${place.citySlug}`, label: place.cityName });
  if (place.districtName && place.districtSlug) {
    trail.push({
      href: `/${place.citySlug}/${place.districtSlug}`,
      label: place.districtName,
    });
  }

  return (
    <nav aria-label="Naviqasiya izi">
      <ol className="flex flex-wrap items-center gap-1.5 text-2xs text-stone-500">
        {trail.map((item, index) => (
          <li key={item.href} className="flex items-center gap-1.5">
            {index > 0 && <span aria-hidden>/</span>}
            {index === trail.length - 1 ? (
              <span className="text-stone-700">{item.label}</span>
            ) : (
              <Link href={item.href} className="hover:text-forest-600">
                {item.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/** Səhifə tipinə uyğun axtarış filtri. */
function buildSearchHref(kind: SeoPageKind, place: SeoPlace): string {
  const params = new URLSearchParams({ q: place.districtName ?? place.cityName });
  if (kind === SEO_PAGE_KINDS.STUDENTS) params.set('forStudents', 'true');
  return `/axtaris?${params.toString()}`;
}
