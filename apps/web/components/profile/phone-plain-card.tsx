'use client';

import { useState } from 'react';
import { Phone } from 'lucide-react';
import { formatPhone, type AuthResultDto } from '@yasayis/shared';
import { api, messageOf } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Panel, Well } from '@/components/ui/card';
import { Field, Input } from '@/components/ui/field';

/**
 * Əlaqə nömrəsi — TƏSDİQSİZ.
 *
 * NİYƏ AYRI KART VAR
 * SMS provayderi qoşulmayanda nömrəni OTP ilə təsdiqləmək mümkün deyil, nömrə
 * isə yalnız OTP axını ilə yazılırdı. Nəticədə ev sahibi tələyə düşürdü:
 * nömrə əlavə edə bilmir → elanında "Nömrəni göstər" düyməsi heç vaxt çıxmır →
 * tələbə yalnız mesaj yaza bilir.
 *
 * Bu kart nömrəni sadəcə YAZIR. "Təsdiqlənib" nişanı vermir və vermə iddiası
 * da etmir — mətn bunu açıq deyir. Fərqi qorumaq vacibdir: nömrənin olması ilə
 * onun yoxlanmış olması eyni şey deyil.
 */
export function PhonePlainCard({
  phone,
  onSaved,
}: {
  phone: string | null;
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(phone ?? '+994');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      await api.post<AuthResultDto>('/auth/phone/set', { phone: value.trim() });
      setOpen(false);
      onSaved();
    } catch (e) {
      setError(messageOf(e, 'Nömrə saxlanılmadı. Bir azdan yenidən cəhd edin.'));
    }

    setBusy(false);
  };

  const remove = async () => {
    setBusy(true);
    setError(null);

    try {
      await api.post<AuthResultDto>('/auth/phone/clear');
      setOpen(false);
      onSaved();
    } catch (e) {
      setError(messageOf(e, 'Nömrə silinmədi. Bir azdan yenidən cəhd edin.'));
    }

    setBusy(false);
  };

  if (!open) {
    return (
      <Panel className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5">
        <div className="min-w-0 flex-1">
          <p className="flex min-w-0 items-center gap-2 text-body font-semibold text-stone-900 sm:text-h3">
            <Phone className="hidden size-4 shrink-0 text-stone-400 sm:block" aria-hidden />
            <span className="tabular truncate">
              {phone ? formatPhone(phone) : 'Əlaqə nömrəsi yoxdur'}
            </span>
          </p>
          <p className="mt-1 text-2xs text-stone-600 sm:text-sm">
            {phone
              ? 'Elanlarınızda göstərilir — tələbə birbaşa zəng edə bilir.'
              : 'Nömrə əlavə etsəniz, elanlarınızda zəng düyməsi çıxacaq. Əks halda yalnız mesaj yazıla bilər.'}
          </p>
        </div>

        <Button size="sm" variant="tertiary" onClick={() => setOpen(true)}>
          {phone ? 'Dəyiş' : 'Nömrə əlavə et'}
        </Button>
      </Panel>
    );
  }

  return (
    <Panel className="p-5 sm:p-6">
      <h2 className="text-h3 text-stone-900">Əlaqə nömrəsi</h2>

      <Well className="mt-3">
        <p className="text-sm leading-relaxed text-stone-700">
          Bu nömrə <strong>təsdiqlənmir</strong> — sadəcə elanlarınızda əlaqə
          üçün göstərilir. Düzgün yazdığınızdan əmin olun, yoxsa sizinlə əlaqə
          saxlaya bilməzlər.
        </p>
      </Well>

      <form onSubmit={save} className="mt-4 flex flex-col gap-4" noValidate>
        {error && (
          <p role="alert" className="text-sm text-danger-600">
            {error}
          </p>
        )}

        <Field label="Telefon nömrəsi" required hint="+994XXXXXXXXX formatında">
          {(p) => (
            <Input
              {...p}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="+994501234567"
            />
          )}
        </Field>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button type="submit" size="sm" loading={busy} fullWidth>
            Saxla
          </Button>
          {phone && (
            <Button
              type="button"
              size="sm"
              variant="danger"
              fullWidth
              disabled={busy}
              onClick={() => void remove()}
            >
              Nömrəni sil
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            variant="tertiary"
            fullWidth
            onClick={() => {
              setValue(phone ?? '+994');
              setError(null);
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
