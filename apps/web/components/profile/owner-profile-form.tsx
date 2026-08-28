'use client';

import { useState } from 'react';
import { Pencil } from 'lucide-react';
import type { OwnerProfileDto } from '@yasayis/shared';
import { api, ApiRequestError } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Checkbox, Field, Input, Textarea } from '@/components/ui/field';

/**
 * Ev sahibi profilinin redaktəsi.
 *
 * `PATCH /me/owner-profile` əvvəldən var idi, amma ekranda yalnız OXUNURDU:
 * ev sahibi nə haqqında mətnini yaza, nə də şirkət adını göstərə bilirdi —
 * sahələr həmişə boş qalırdı.
 *
 * "Şirkət/agentlikəm" işarələnəndə şirkət adı MƏCBURİ olur (server də bunu
 * tələb edir): axtarışda "Ev sahibi / Vasitəçi" filtri buna əsaslanır və adsız
 * vasitəçi tələbə üçün mənasızdır.
 */
export function OwnerProfileForm({
  owner,
  onSaved,
}: {
  owner: OwnerProfileDto;
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [about, setAbout] = useState(owner.about ?? '');
  const [isCompany, setIsCompany] = useState(owner.isCompany);
  const [companyName, setCompanyName] = useState(owner.companyName ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  if (!open) {
    return (
      <Button size="sm" variant="tertiary" onClick={() => setOpen(true)}>
        <Pencil className="size-4" aria-hidden />
        Profili redaktə et
      </Button>
    );
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setFieldErrors({});

    try {
      await api.patch('/me/owner-profile', {
        about: about.trim() || null,
        isCompany,
        companyName: isCompany ? companyName.trim() : null,
      });
      setOpen(false);
      onSaved();
    } catch (e) {
      if (e instanceof ApiRequestError && e.fields) {
        setFieldErrors(
          Object.fromEntries(Object.entries(e.fields).map(([k, v]) => [k, v[0] ?? ''])),
        );
      } else {
        setError('Saxlamaq alınmadı. Bir azdan yenidən yoxlayın.');
      }
    }

    setBusy(false);
  };

  return (
    <form onSubmit={submit} className="flex w-full flex-col gap-4" noValidate>
      {error && (
        <p
          role="alert"
          className="rounded-[var(--radius-input)] bg-danger-50 px-3.5 py-2.5 text-sm text-danger-600 ring-1 ring-danger-100"
        >
          {error}
        </p>
      )}

      <Field
        label="Haqqında"
        error={fieldErrors.about}
        hint="Tələbələr kimə yazdıqlarını bilsin — bir-iki cümlə kifayətdir."
        aside={`${about.length}/1000`}
      >
        {(p) => (
          <Textarea
            {...p}
            rows={4}
            maxLength={1000}
            value={about}
            onChange={(e) => setAbout(e.target.value)}
            placeholder="Nərimanovda iki mənzilim var, uzun illərdir tələbələrə kirayə verirəm."
          />
        )}
      </Field>

      <Checkbox
        label="Şirkət və ya vasitəçiyəm"
        description="Axtarışdakı “Ev sahibi / Vasitəçi” filtri buna görə işləyir."
        checked={isCompany}
        onChange={(e) => setIsCompany(e.target.checked)}
      />

      {isCompany && (
        <Field label="Şirkət adı" required error={fieldErrors.companyName}>
          {(p) => (
            <Input
              {...p}
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Ev Agentliyi MMC"
            />
          )}
        </Field>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button type="submit" size="sm" loading={busy} fullWidth>
          Saxla
        </Button>
        <Button
          type="button"
          size="sm"
          variant="tertiary"
          fullWidth
          onClick={() => {
            setAbout(owner.about ?? '');
            setIsCompany(owner.isCompany);
            setCompanyName(owner.companyName ?? '');
            setFieldErrors({});
            setError(null);
            setOpen(false);
          }}
        >
          İmtina
        </Button>
      </div>
    </form>
  );
}
