'use client';

import { useEffect, useState } from 'react';
import { FileWarning } from 'lucide-react';
import type { ListingDetailDto } from '@yasayis/shared';
import { api, ApiRequestError } from '@/lib/api-client';
import { EmptyState } from '@/components/empty/empty-state';
import { ButtonLink } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/card';
import { ListingForm } from './listing-form';

/**
 * Redaktə səhifəsinin yükləyicisi.
 *
 * Elan client tərəfdə oxunur, çünki `ListingForm` onsuz da client komponentidir
 * və sessiyaya bağlı cavab (dəqiq ünvan yalnız sahibinə gəlir) server render-də
 * cookie ötürməyi tələb edərdi.
 */
export function ListingEditor({ slug }: { slug: string }) {
  const [listing, setListing] = useState<ListingDetailDto | null>(null);
  const [error, setError] = useState<'notfound' | 'auth' | 'unknown' | null>(null);

  useEffect(() => {
    let cancelled = false;

    api
      .get<ListingDetailDto>(`/listings/${slug}`)
      .then((l) => {
        if (!cancelled) setListing(l);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        if (e instanceof ApiRequestError && e.status === 404) setError('notfound');
        else if (e instanceof ApiRequestError && (e.status === 401 || e.status === 403)) {
          setError('auth');
        } else setError('unknown');
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (error) {
    return (
      <EmptyState
        icon={FileWarning}
        title={error === 'notfound' ? 'Elan tapılmadı.' : 'Elan açıla bilmədi.'}
        description={
          error === 'auth'
            ? 'Yalnız öz elanınızı redaktə edə bilərsiniz.'
            : 'Elan silinmiş və ya ünvan səhv ola bilər.'
        }
        actions={<ButtonLink href="/profil">Elanlarıma qayıt</ButtonLink>}
      />
    );
  }

  if (!listing) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full rounded-[var(--radius-panel)]" />
      </div>
    );
  }

  return <ListingForm editing={listing} />;
}
