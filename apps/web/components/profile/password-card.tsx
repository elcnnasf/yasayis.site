'use client';

import { useState } from 'react';
import { KeyRound } from 'lucide-react';
import { api, ApiRequestError } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/field';
import { Panel } from '@/components/ui/card';

/**
 * Parolun dəyişdirilməsi.
 *
 * Server bu əməliyyatdan sonra BÜTÜN sessiyaları ləğv edir (oğurlanmış parol
 * ssenarisi), amma cari cihazın cookie-si yerində qalır — ona görə istifadəçi
 * buradan çıxarılmır və ekranda bu açıq yazılır.
 */
export function PasswordCard() {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);

  const reset = () => {
    setCurrent('');
    setNext('');
    setConfirm('');
    setError(null);
    setFieldErrors({});
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setFieldErrors({});

    try {
      await api.post('/auth/password/change', {
        currentPassword: current,
        newPassword: next,
        newPasswordConfirm: confirm,
      });
      reset();
      setOpen(false);
      setDone(true);
    } catch (e) {
      if (e instanceof ApiRequestError) {
        if (e.fields) {
          setFieldErrors(
            Object.fromEntries(Object.entries(e.fields).map(([k, v]) => [k, v[0] ?? ''])),
          );
        }
        setError(e.fields ? null : e.message);
      } else {
        setError('Serverlə əlaqə alınmadı. Bir azdan yenidən yoxlayın.');
      }
    }

    setBusy(false);
  };

  if (!open) {
    return (
      <Panel className="flex flex-wrap items-center justify-between gap-3 p-5">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-h3 text-stone-900">
            <KeyRound className="size-4 shrink-0 text-stone-400" aria-hidden />
            Parol
          </p>
          <p className="mt-1 text-sm text-stone-600">
            {done
              ? 'Parol dəyişdirildi. Digər cihazlardan çıxış edildi.'
              : 'Vaxtaşırı dəyişdirmək hesabını qoruyur.'}
          </p>
        </div>

        <Button
          size="sm"
          variant="tertiary"
          onClick={() => {
            setDone(false);
            setOpen(true);
          }}
        >
          Parolu dəyiş
        </Button>
      </Panel>
    );
  }

  return (
    <Panel className="p-5 sm:p-6">
      <h2 className="text-h3 text-stone-900">Parolu dəyiş</h2>

      <form onSubmit={submit} className="mt-4 flex flex-col gap-4" noValidate>
        {error && (
          <p
            role="alert"
            className="rounded-[var(--radius-input)] bg-danger-50 px-3.5 py-2.5 text-sm text-danger-600 ring-1 ring-danger-100"
          >
            {error}
          </p>
        )}

        <Field label="Cari parol" required error={fieldErrors.currentPassword}>
          {(p) => (
            <Input
              {...p}
              type="password"
              autoComplete="current-password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              placeholder="••••••••"
            />
          )}
        </Field>

        <Field
          label="Yeni parol"
          required
          error={fieldErrors.newPassword}
          hint="Ən azı 8 simvol, bir hərf və bir rəqəm"
        >
          {(p) => (
            <Input
              {...p}
              type="password"
              autoComplete="new-password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              placeholder="••••••••"
            />
          )}
        </Field>

        <Field label="Yeni parolu təkrarla" required error={fieldErrors.newPasswordConfirm}>
          {(p) => (
            <Input
              {...p}
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="••••••••"
            />
          )}
        </Field>

        <p className="text-2xs leading-relaxed text-stone-500">
          Parol dəyişəndən sonra digər bütün cihazlarda sessiya bağlanır. Bu cihaz
          açıq qalır.
        </p>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button type="submit" loading={busy} fullWidth>
            Parolu dəyiş
          </Button>
          <Button
            type="button"
            variant="tertiary"
            fullWidth
            onClick={() => {
              reset();
              setOpen(false);
            }}
          >
            İmtina
          </Button>
        </div>
      </form>
    </Panel>
  );
}
