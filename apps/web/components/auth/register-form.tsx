'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { AuthResultDto, InitialRole } from '@yasayis/shared';
import { api, ApiRequestError } from '@/lib/api-client';
import { resetFavorites } from '@/lib/favorites';
import { Button } from '@/components/ui/button';
import { Checkbox, ChoiceGroup, Field, Input } from '@/components/ui/field';
import { GoogleButton } from './google-button';

/**
 * E-poçt + parol ilə qeydiyyat.
 *
 * Sahə sayı minimumdadır: ad, e-poçt, parol, rol. Universitet, büdcə və
 * vərdişlər BURADA soruşulmur — onlar onboarding-in işidir. Uzun qeydiyyat
 * forması ilk addımda ən çox adamı itirir, halbuki bu məlumatların hamısı
 * qeydiyyatdan SONRA da toplana bilər.
 *
 * Rol seçimi additivdir: "Tələbə" seçmək ev sahibi olmağı bağlamır, sonradan
 * profildən ikinci rol açılır.
 */

const ROLES: { value: InitialRole; label: string; description: string }[] = [
  {
    value: 'STUDENT',
    label: 'Yaşayış axtarıram',
    description: 'Ev, otaq və ya otaq yoldaşı axtaran tələbə.',
  },
  {
    value: 'OWNER',
    label: 'Elan yerləşdirmək istəyirəm',
    description: 'Kirayə verəcəyi evi və ya otağı olan ev sahibi.',
  },
  {
    value: 'BOTH',
    label: 'Hər ikisi',
    description: 'Həm axtarıram, həm də elan yerləşdirəcəyəm.',
  },
];

export function RegisterForm() {
  const router = useRouter();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [role, setRole] = useState<InitialRole>('STUDENT');
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setFieldErrors({});

    try {
      await api.post<AuthResultDto>('/auth/register', {
        fullName,
        email,
        password,
        passwordConfirm,
        role,
        acceptedTerms,
      });

      resetFavorites();

      // Yeni hesab həmişə onboarding-ə gedir — profil boş olsa uyğunluq
      // hesablana bilmir və platformanın əsas dəyəri işləmir.
      router.replace('/basla');
      router.refresh();
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
          e.status === 409
            ? 'Bu e-poçt artıq qeydiyyatdadır. Daxil olmağı yoxlayın.'
            : e.fields
              ? 'Formada düzəliş lazımdır.'
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

      <Field label="Ad və soyad" required error={fieldErrors.fullName}>
        {(p) => (
          <Input
            {...p}
            autoComplete="name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Aysel Məmmədova"
          />
        )}
      </Field>

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

      <Field
        label="Parol"
        required
        error={fieldErrors.password}
        hint="Ən azı 8 simvol, içində rəqəm və hərf olsun."
      >
        {(p) => (
          <Input
            {...p}
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        )}
      </Field>

      <Field label="Parolu təkrar yazın" required error={fieldErrors.passwordConfirm}>
        {(p) => (
          <Input
            {...p}
            type="password"
            autoComplete="new-password"
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            placeholder="••••••••"
          />
        )}
      </Field>

      <ChoiceGroup
        name="role"
        legend="Platformadan necə istifadə edəcəksən?"
        options={ROLES}
        value={role}
        onChange={setRole}
        error={fieldErrors.role}
      />

      <Checkbox
        label={
          <>
            <Link href="/qaydalar" className="font-semibold text-sprout-600 hover:underline">
              İstifadə şərtlərini
            </Link>{' '}
            və{' '}
            <Link href="/mexfilik" className="font-semibold text-sprout-600 hover:underline">
              məxfilik siyasətini
            </Link>{' '}
            qəbul edirəm.
          </>
        }
        checked={acceptedTerms}
        onChange={(e) => setAcceptedTerms(e.target.checked)}
        error={fieldErrors.acceptedTerms}
      />

      <Button type="submit" size="lg" fullWidth loading={busy} className="mt-1">
        Qeydiyyatdan keç
      </Button>

      <div className="flex items-center gap-3" aria-hidden>
        <span className="h-px flex-1 bg-stone-200" />
        <span className="text-2xs uppercase tracking-wide text-stone-400">və ya</span>
        <span className="h-px flex-1 bg-stone-200" />
      </div>

      <GoogleButton label="Google ilə davam et" />
    </form>
  );
}
