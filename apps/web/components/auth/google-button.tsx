'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/button';

/**
 * Google ilə giriş.
 *
 * Düymə YALNIZ server tərəfdə açarlar qurulubsa görünür. Səbəb: konfiqurasiya
 * olmayanda `client_id` boş gedirdi və istifadəçi Google-un "invalid_client"
 * xəta səhifəsində qalırdı — işləməyən düymə heç olmamaqdan pisdir.
 *
 * `state` sessionStorage-da saxlanılır: geri qayıdan zaman Google-un
 * qaytardığı `state` ilə müqayisə olunur (CSRF).
 */

export const GOOGLE_STATE_KEY = 'yasayis:google-state';

interface GoogleUrlDto {
  configured: boolean;
  url: string | null;
  state: string | null;
}

export function GoogleButton({ label }: { label: string }) {
  const [available, setAvailable] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;

    api
      .get<GoogleUrlDto>('/auth/google/url')
      .then((r) => {
        if (!cancelled) setAvailable(r.configured);
      })
      .catch(() => {
        if (!cancelled) setAvailable(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (!available) return null;

  const start = async () => {
    setBusy(true);
    try {
      // Ünvan İKİNCİ dəfə alınır: birinci sorğu yalnız "aktivdirmi" sualına
      // cavab verirdi, `state` isə hər keçid üçün təzə olmalıdır.
      const r = await api.get<GoogleUrlDto>('/auth/google/url', {
        redirectUri: `${window.location.origin}/giris/google`,
      });
      if (!r.url || !r.state) throw new Error('unavailable');
      sessionStorage.setItem(GOOGLE_STATE_KEY, r.state);
      window.location.href = r.url;
    } catch {
      setBusy(false);
      setAvailable(false);
    }
  };

  return (
    <Button type="button" variant="tertiary" fullWidth loading={busy} onClick={() => void start()}>
      <GoogleMark />
      {label}
    </Button>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-4 shrink-0" aria-hidden>
      <path
        fill="#4285F4"
        d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.7v3h3.9c2.3-2.1 3.5-5.2 3.5-8.9Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.9-3c-1.1.7-2.4 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9H1.4v3.1A12 12 0 0 0 12 24Z"
      />
      <path fill="#FBBC05" d="M5.4 14.4a7.2 7.2 0 0 1 0-4.6V6.7H1.4a12 12 0 0 0 0 10.8l4-3.1Z" />
      <path
        fill="#EA4335"
        d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.4 6.7l4 3.1C6.3 6.9 8.9 4.8 12 4.8Z"
      />
    </svg>
  );
}
