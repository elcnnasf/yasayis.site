'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { AuthResultDto } from '@yasayis/shared';
import { api, messageOf } from '@/lib/api-client';
import { resetFavorites } from '@/lib/favorites';
import { ButtonLink } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/card';
import { GOOGLE_STATE_KEY } from './google-button';

/**
 * Google-dan qayıdış.
 *
 * `state` müqayisəsi CSRF-ə qarşıdır: kənar sayt istifadəçini öz `code`-u ilə
 * bura göndərə bilməsin. Dəyər girişə başlayanda `sessionStorage`-a yazılır və
 * burada bir dəfə işlədilib silinir.
 */
export function GoogleCallback() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  // React 18 strict mode-da effekt iki dəfə işləyir; `code` isə birdəfəlikdir.
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const code = params.get('code');
    const state = params.get('state');
    const expected = sessionStorage.getItem(GOOGLE_STATE_KEY);
    sessionStorage.removeItem(GOOGLE_STATE_KEY);

    if (params.get('error')) {
      setError('Google girişi ləğv edildi.');
      return;
    }
    if (!code) {
      setError('Google cavabı natamamdır. Yenidən cəhd edin.');
      return;
    }
    if (!expected || expected !== state) {
      setError('Təhlükəsizlik yoxlaması keçmədi. Girişə yenidən başlayın.');
      return;
    }

    api
      .post<AuthResultDto>('/auth/google', {
        code,
        redirectUri: `${window.location.origin}/giris/google`,
      })
      .then((result) => {
        resetFavorites();
        router.replace(result.user.onboarded ? '/' : '/basla');
        router.refresh();
      })
      .catch((e: unknown) => {
        setError(messageOf(e, 'Google ilə giriş alınmadı. Yenidən cəhd edin.'));
      });
  }, [params, router]);

  if (error) {
    return (
      <div className="flex flex-col gap-4">
        <p
          role="alert"
          className="rounded-[var(--radius-input)] bg-danger-50 px-3.5 py-2.5 text-sm text-danger-600 ring-1 ring-danger-100"
        >
          {error}
        </p>
        <ButtonLink href="/giris" fullWidth>
          Girişə qayıt
        </ButtonLink>
      </div>
    );
  }

  return <Skeleton className="h-24 w-full" />;
}
