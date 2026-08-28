'use client';

import { useState } from 'react';
import { CheckCircle2, Send } from 'lucide-react';
import { MESSAGE } from '@yasayis/shared';
import { api, messageOf } from '@/lib/api-client';
import { Button, ButtonLink } from '@/components/ui/button';
import { Field, Textarea } from '@/components/ui/field';

/**
 * Elan sahibinə mesaj yazmaq.
 *
 * NİYƏ VAR
 * Ev sahibi telefon nömrəsi əlavə etməyibsə, tələbənin onunla əlaqə saxlamaq
 * üçün heç bir yolu qalmırdı: "Əlaqə saxla" düyməsi söndürülü dayanırdı və
 * elan praktik olaraq ölü olurdu. Bu forma həmin boşluğu bağlayır.
 *
 * Mesaj göndərəndən sonra forma söhbətə YÖNLƏNDİRMİR, sadəcə təsdiq göstərir
 * və söhbətə keçid verir: istifadəçi elan səhifəsindən çıxarılmır, çünki o,
 * ehtimal ki, hələ digər elanlara baxmağa davam edəcək.
 */
export function MessageDialog({
  recipientId,
  listingId,
  recipientName,
  defaultBody,
  onClose,
}: {
  recipientId: string;
  listingId?: string;
  recipientName: string;
  defaultBody?: string;
  onClose: () => void;
}) {
  const [body, setBody] = useState(defaultBody ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      await api.post('/me/messages', {
        recipientId,
        listingId: listingId ?? null,
        body: body.trim(),
      });
      setSent(true);
    } catch (e) {
      setError(messageOf(e, 'Mesaj göndərilmədi. Bir azdan yenidən cəhd edin.'));
    }

    setBusy(false);
  };

  if (sent) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-[var(--radius-input)] bg-sprout-50 p-4 text-center ring-1 ring-sprout-200">
        <CheckCircle2 className="size-7 text-forest-600" aria-hidden />
        <p className="text-sm text-stone-700">
          Mesaj göndərildi. Cavab gələndə «Mesajlar» bölməsində görəcəksən.
        </p>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <ButtonLink href="/panel/mesajlar" size="sm">
            Mesajlara keç
          </ButtonLink>
          <Button size="sm" variant="tertiary" onClick={onClose}>
            Bağla
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3" noValidate>
      {error && (
        <p role="alert" className="text-sm text-danger-600">
          {error}
        </p>
      )}

      <Field
        label={`${recipientName} adlı istifadəçiyə mesaj`}
        required
        aside={`${body.length}/${MESSAGE.BODY_MAX}`}
      >
        {(p) => (
          <Textarea
            {...p}
            rows={4}
            maxLength={MESSAGE.BODY_MAX}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Salam, elan hələ aktualdırmı? Baxmaq üçün nə vaxt uyğundur?"
          />
        )}
      </Field>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button type="submit" size="sm" fullWidth loading={busy} disabled={!body.trim()}>
          <Send className="size-4" aria-hidden />
          Göndər
        </Button>
        <Button type="button" size="sm" variant="tertiary" fullWidth onClick={onClose}>
          İmtina
        </Button>
      </div>
    </form>
  );
}
