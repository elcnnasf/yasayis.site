'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import type { AuthResultDto } from '@yasayis/shared';
import { api, ApiRequestError } from '@/lib/api-client';
import { resetFavorites } from '@/lib/favorites';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/field';
import { cn } from '@/lib/cn';
import { GoogleButton } from './google-button';
import { PhoneVerify } from './phone-verify';

/**
 * Giriş — iki yol: e-poçt + parol, telefon + SMS kodu.
 *
 * Hər ikisi API-də əvvəldən var idi, amma ekranda yalnız e-poçt yolu vardı:
 * telefonla qeydiyyatdan keçmiş (parolu olmayan) istifadəçi ümumiyyətlə daxil
 * ola bilmirdi.
 *
 * Xəta mesajı qəsdən ÜMUMİDİR ("e-poçt və ya parol yanlışdır"): "bu e-poçt
 * tapılmadı" cavabı kənar adama hansı ünvanların sistemdə olduğunu deyir və
 * hesab sayımına imkan verir.
 *
 * Girişdən sonra hara gedilir:
 *   · onboarding bitməyibsə → `/basla` (yarımçıq profil uyğunluğu pozur)
 *   · `?davam=` varsa       → istifadəçinin gəldiyi səhifəyə
 *   · qalan hallarda        → ana səhifə
 */

type Method = 'email' | 'phone';

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [method, setMethod] = useState<Method>('email');

  /** Hər iki yolun sonu eynidir — sessiya quruldu, indi hara? */
  const finish = (result: AuthResultDto) => {
    // Favorit store-u qonaq halında qalmasın — indi sessiya var.
    resetFavorites();

    // `router.refresh()` sessiya cookie-si təzə qoyulduğu üçün lazımdır —
    // onsuz başlıq və ana səhifə hələ də qonaq görünüşünü göstərir.
    const next = result.user.onboarded ? (params.get('davam') ?? '/') : '/basla';
    router.replace(next);
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-5">
      <MethodTabs value={method} onChange={setMethod} />

      {method === 'email' ? (
        <EmailLogin onDone={finish} />
      ) : (
        <PhoneVerify
          purpose="LOGIN"
          submitLabel="Daxil ol"
          onVerify={async (phone, code) => {
            const result = await api.post<AuthResultDto>('/auth/phone/login', {
              phone,
              code,
              purpose: 'LOGIN',
            });
            finish(result);
          }}
        />
      )}

      <div className="flex items-center gap-3" aria-hidden>
        <span className="h-px flex-1 bg-stone-200" />
        <span className="text-2xs uppercase tracking-wide text-stone-400">və ya</span>
        <span className="h-px flex-1 bg-stone-200" />
      </div>

      <GoogleButton label="Google ilə daxil ol" />
    </div>
  );
}

function MethodTabs({ value, onChange }: { value: Method; onChange: (m: Method) => void }) {
  const tabs: { id: Method; label: string }[] = [
    { id: 'email', label: 'E-poçt' },
    { id: 'phone', label: 'Telefon' },
  ];

  return (
    <div className="flex gap-1 rounded-[var(--radius-input)] bg-stone-100 p-1">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          aria-pressed={value === t.id}
          onClick={() => onChange(t.id)}
          className={cn(
            'flex-1 rounded-[calc(var(--radius-input)-0.2rem)] py-2 text-sm font-semibold transition-colors',
            value === t.id
              ? 'bg-white text-stone-900 shadow-[var(--shadow-xs)]'
              : 'text-stone-600 hover:text-stone-900',
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

function EmailLogin({ onDone }: { onDone: (result: AuthResultDto) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setFieldErrors({});

    try {
      onDone(await api.post<AuthResultDto>('/auth/login', { email, password }));
    } catch (e) {
      if (e instanceof ApiRequestError) {
        if (e.fields) {
          setFieldErrors(
            Object.fromEntries(
              Object.entries(e.fields).map(([k, v]) => [k, v[0] ?? '']),
            ),
          );
        }
        setError(
          e.status === 401 || e.status === 404
            ? 'E-poçt və ya parol yanlışdır.'
            : e.message,
        );
      } else {
        setError('Serverlə əlaqə alınmadı. Bir azdan yenidən yoxlayın.');
      }
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      {error && (
        <p
          role="alert"
          className="rounded-[var(--radius-input)] bg-danger-50 px-3.5 py-2.5 text-sm text-danger-600 ring-1 ring-danger-100"
        >
          {error}
        </p>
      )}

      <Field label="E-poçt" required error={fieldErrors.email}>
        {(p) => (
          <Input
            {...p}
            type="email"
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ad@nümunə.az"
          />
        )}
      </Field>

      <Field label="Parol" required error={fieldErrors.password}>
        {(p) => (
          <Input
            {...p}
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        )}
      </Field>

      <Button type="submit" size="lg" fullWidth loading={busy} className="mt-1">
        Daxil ol
      </Button>

      <Link
        href="/parol-sifirla"
        className="text-center text-sm font-medium text-forest-700 hover:underline"
      >
        Parolu unutmusan?
      </Link>
    </form>
  );
}
