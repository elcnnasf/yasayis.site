'use client';

import { useState } from 'react';
import { CircleCheck, Pencil, RotateCw } from 'lucide-react';
import {
  canTransition,
  expireReasonLabels,
  ListingStatus,
  statusExplanations,
  type ExpireListingInput,
  type MyListingDto,
} from '@yasayis/shared';
import { api, messageOf } from '@/lib/api-client';
import { Button, ButtonLink } from '@/components/ui/button';
import { Select } from '@/components/ui/field';

/**
 * Elan üzərində sahibinin əməliyyatları.
 *
 * İki endpoint (`/renew`, `/expire`) əvvəldən var idi, amma heç bir düymə onları
 * çağırmırdı: ev sahibi kirayə verdiyi evin elanını bağlaya bilmirdi və müddəti
 * bitmiş elanı uzada bilmirdi — hər ikisi üçün yeganə yol yeni elan yaratmaq idi.
 *
 * Hansı düymənin görünəcəyini `canTransition` həll edir — icazəli keçidlərin
 * siyahısı `packages/shared`-dədir və server də eyni siyahını işlədir, ona görə
 * ekranda göstərilən düymə serverdə rədd edilmir.
 */
export function MyListingActions({
  listing,
  onChanged,
}: {
  listing: MyListingDto;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState<'renew' | 'expire' | null>(null);
  const [asking, setAsking] = useState(false);
  const [reason, setReason] = useState<ExpireListingInput['reason'] | ''>('');
  const [error, setError] = useState<string | null>(null);

  const canRenew = canTransition(listing.status, ListingStatus.PENDING);
  const canExpire = canTransition(listing.status, ListingStatus.EXPIRED);

  const run = async (action: 'renew' | 'expire') => {
    setBusy(action);
    setError(null);

    try {
      await api.post(
        `/listings/${listing.id}/${action}`,
        action === 'expire' ? { reason: reason || undefined } : {},
      );
      setAsking(false);
      setReason('');
      onChanged();
    } catch (e) {
      setError(messageOf(e, 'Əməliyyat alınmadı. Bir azdan yenidən cəhd edin.'));
    }

    setBusy(null);
  };

  // Redaktə həmişə mümkündür (dayandırılmış elandan başqa — serverdə də belədir),
  // ona görə düymə keçid siyahısından asılı deyil.
  const canEdit = listing.status !== ListingStatus.SUSPENDED;

  if (!canRenew && !canExpire) {
    return (
      <div className="mt-2 flex flex-col gap-2">
        <p className="text-2xs leading-relaxed text-stone-500">
          {statusExplanations[listing.status]}
        </p>
        {canEdit && (
          <div>
            <ButtonLink href={`/elan/${listing.slug}/redakte`} size="sm" variant="tertiary">
              <Pencil className="size-4" aria-hidden />
              Redaktə et
            </ButtonLink>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mt-2 flex flex-col gap-2">
      <p className="text-2xs leading-relaxed text-stone-500">
        {statusExplanations[listing.status]}
      </p>

      {error && (
        <p role="alert" className="text-sm text-danger-600">
          {error}
        </p>
      )}

      {asking ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Select
            aria-label="Elanı niyə bağlayırsınız?"
            value={reason}
            onChange={(e) => setReason(e.target.value as ExpireListingInput['reason'])}
            className="h-9 text-sm sm:max-w-56"
          >
            <option value="">Səbəb (istəyə bağlı)</option>
            {Object.entries(expireReasonLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>

          <div className="flex gap-2">
            <Button
              size="sm"
              variant="danger"
              loading={busy === 'expire'}
              onClick={() => void run('expire')}
            >
              Bağla
            </Button>
            <Button size="sm" variant="tertiary" onClick={() => setAsking(false)}>
              İmtina
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {canEdit && (
            <ButtonLink href={`/elan/${listing.slug}/redakte`} size="sm" variant="tertiary">
              <Pencil className="size-4" aria-hidden />
              Redaktə et
            </ButtonLink>
          )}
          {canRenew && (
            <Button
              size="sm"
              variant="secondary"
              loading={busy === 'renew'}
              onClick={() => void run('renew')}
            >
              <RotateCw className="size-4" aria-hidden />
              Yenidən dərc et
            </Button>
          )}
          {canExpire && (
            <Button size="sm" variant="tertiary" onClick={() => setAsking(true)}>
              <CircleCheck className="size-4" aria-hidden />
              Artıq aktual deyil
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
