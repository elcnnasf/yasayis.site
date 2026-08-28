'use client';

import { useState } from 'react';
import { AlertTriangle, CheckCircle2, Home, LogIn } from 'lucide-react';
import { api } from '@/lib/api-client';
import { EmptyState } from '@/components/empty/empty-state';
import { Button, ButtonLink } from '@/components/ui/button';
import { Panel } from '@/components/ui/card';

/**
 * Formanın forma OLMADIĞI hallar.
 *
 * Üçü də formanın özündən ayrı saxlanılır: hər biri tam ekranı əvəz edir və
 * `listing-form.tsx`-in içində qalsaydı, əsas axını oxumaq üçün onların
 * arasından keçmək lazım gələrdi.
 */

/** Qonaq — elan yerləşdirmək üçün hesab lazımdır. */
export function GateSignedOut() {
  return (
    <EmptyState
      icon={LogIn}
      title="Elan yerləşdirmək üçün daxil ol."
      description="Elan hesabına bağlanır — sonradan redaktə etmək, müddətini uzatmaq və gələn müraciətləri görmək üçün."
      actions={
        <>
          <ButtonLink href="/giris?davam=/elan/yeni">Daxil ol</ButtonLink>
          <ButtonLink href="/qeydiyyat" variant="tertiary">
            Qeydiyyatdan keç
          </ButtonLink>
        </>
      }
    />
  );
}

/**
 * Hesab var, amma ev sahibi rolu yoxdur.
 *
 * Ayrıca qeydiyyat TƏLƏB OLUNMUR: rollar additivdir və bir düymə ilə açılır.
 * İstifadəçini yeni hesab açmağa göndərmək eyni adamın iki hesabı deməkdir.
 */
export function GateNotOwner({ onEnabled }: { onEnabled: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const enable = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.post('/auth/roles', { isOwner: true });
      onEnabled();
    } catch {
      setError('Rol açılmadı. Bir azdan yenidən cəhd edin.');
      setBusy(false);
    }
  };

  return (
    <Panel className="flex flex-col items-center px-6 py-12 text-center sm:py-14">
      <span
        aria-hidden
        className="grid size-14 place-items-center rounded-full bg-sprout-100 text-forest-600"
      >
        <Home className="size-6" strokeWidth={1.75} />
      </span>

      <p className="mt-5 max-w-md text-h3 text-stone-900">
        Elan yerləşdirmək üçün ev sahibi rolunu aç.
      </p>
      <p className="mt-2 max-w-md text-body leading-relaxed text-stone-600">
        Bir toxunuşla açılır. Tələbə profilin olduğu kimi qalır — hər iki rol eyni
        hesabda işləyir.
      </p>

      {error && (
        <p role="alert" className="mt-4 text-sm text-danger-600">
          {error}
        </p>
      )}

      <Button className="mt-6" size="lg" loading={busy} onClick={enable}>
        Ev sahibi rolunu aç
      </Button>
    </Panel>
  );
}

/**
 * Elan göndərildi.
 *
 * Şəkillərin bir hissəsi yüklənməyibsə bu GİZLƏDİLMİR: elan yaradılıb və
 * yaradılıb, amma ev sahibi hansı faylların çatmadığını bilməlidir ki,
 * elanı açıb yenidən əlavə etsin. Səssiz uğursuzluq ən pisidir.
 */
export function SubmittedNotice({
  slug,
  failedPhotos,
  onNew,
}: {
  slug: string;
  failedPhotos: string[];
  onNew: () => void;
}) {
  return (
    <Panel className="flex flex-col items-center px-6 py-12 text-center sm:py-14">
      <span
        aria-hidden
        className="grid size-14 place-items-center rounded-full bg-sprout-100 text-forest-600"
      >
        <CheckCircle2 className="size-6" strokeWidth={1.75} />
      </span>

      <p className="mt-5 max-w-md text-h3 text-stone-900">Elan dərc olundu.</p>
      <p className="mt-2 max-w-md text-body leading-relaxed text-stone-600">
        Elanınız artıq canlıdır — tələbələr onu axtarışda görə bilər. İstənilən
        vaxt profil bölməsindən redaktə edə və ya bağlaya bilərsiniz.
      </p>

      {failedPhotos.length > 0 && (
        <div className="mt-5 flex w-full max-w-md items-start gap-2.5 rounded-[var(--radius-input)] bg-warning-50 px-3.5 py-3 text-left ring-1 ring-warning-100">
          <AlertTriangle
            className="mt-0.5 size-4 shrink-0 text-warning-600"
            strokeWidth={1.9}
            aria-hidden
          />
          <p className="text-sm leading-relaxed text-stone-700">
            Bu şəkillər yüklənmədi:{' '}
            <span className="font-semibold">{failedPhotos.join(', ')}</span>. Elanı açıb
            yenidən əlavə edə bilərsiniz.
          </p>
        </div>
      )}

      <div className="mt-6 flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
        <ButtonLink href={`/elan/${slug}`}>Elana bax</ButtonLink>
        <ButtonLink href="/profil" variant="secondary">
          Elanlarım
        </ButtonLink>
        <Button variant="tertiary" onClick={onNew}>
          Yeni elan yerləşdir
        </Button>
      </div>
    </Panel>
  );
}
