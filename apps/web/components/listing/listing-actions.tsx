'use client';

import { useState } from 'react';
import { Check, Heart, Share2 } from 'lucide-react';
import {
  FavoriteTarget,
  listingContactMessage,
  ReportTarget,
} from '@yasayis/shared';
import { api, ApiRequestError } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { ContactButton } from '@/components/shared/contact-button';
import { ReportButton } from '@/components/shared/report-dialog';
import { cn } from '@/lib/cn';

/**
 * Elan hərəkətləri: əlaqə, favorit, paylaşma, şikayət.
 *
 * İyerarxiya qəsdəndir — "Əlaqə saxla" primary, favorit və paylaşma ikinci
 * dərəcəli, şikayət isə ən aşağıda və çərçivəsizdir: lazım olanda tapılır,
 * amma səhifənin diqqətini oğurlamır.
 */
export function ListingActions({
  listingId,
  title,
  canContact,
  isFavorite = false,
  ownerId,
  ownerName,
  ownerHasPhone = true,
}: {
  listingId: string;
  title: string;
  /** Giriş etmiş istifadəçidirmi — nömrəni açmaq hüququ buna bağlıdır. */
  canContact: boolean;
  isFavorite?: boolean;
  /** Nömrə yoxdursa mesaj yazmaq üçün lazımdır. */
  ownerId?: string;
  ownerName?: string;
  ownerHasPhone?: boolean;
}) {
  const [favorite, setFavorite] = useState(isFavorite);
  const [favBusy, setFavBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const toggleFavorite = async () => {
    const next = !favorite;
    setFavorite(next);
    setFavBusy(true);

    try {
      if (next) {
        await api.post('/favorites', {
          targetType: FavoriteTarget.LISTING,
          targetId: listingId,
        });
      } else {
        await api.delete(`/favorites/${FavoriteTarget.LISTING}/${listingId}`);
      }
    } catch (e) {
      setFavorite(!next);
      setNotice(
        e instanceof ApiRequestError && e.status === 401
          ? 'Saxlamaq üçün daxil olun.'
          : 'Əməliyyat alınmadı.',
      );
    }

    setFavBusy(false);
  };

  const share = async () => {
    const url = window.location.href;
    // Mobil brauzerlərdə sistem paylaşma pəncərəsi, digər hallarda linki kopyalayır.
    if (navigator.share) {
      await navigator.share({ title, url }).catch(() => undefined);
      return;
    }
    await navigator.clipboard.writeText(url).catch(() => undefined);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const contactMessage =
    typeof window !== 'undefined'
      ? listingContactMessage(title, window.location.href)
      : undefined;

  return (
    <div className="flex flex-col gap-3">
      {/*
        `canReveal` nömrənin ÖZÜNÜ deyil, açmaq hüququnu bildirir. Nömrə
        serverdən yalnız düyməyə basıldıqda gəlir — bax: `ContactButton`.
      */}
      <ContactButton
        listingId={listingId}
        canReveal={canContact}
        message={contactMessage}
        ownerId={ownerId}
        ownerName={ownerName}
        ownerHasPhone={ownerHasPhone}
      />

      {/*
        Etiketlər QISADIR ("Saxla", "Paylaş"). Düymələr 320 piksellik yan
        paneldə iki sütuna bölünür — hər sütuna ~150 piksel düşür və
        "Sevimlilərə əlavə et" ora sığmır: mətn kəsilir, ikon sıxılır.
        İkon + qısa söz həm sığır, həm də mənası açıqdır.
      */}
      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="tertiary"
          onClick={toggleFavorite}
          loading={favBusy}
          aria-pressed={favorite}
          aria-label={favorite ? 'Saxlananlardan çıxar' : 'Elanı saxla'}
        >
          <Heart
            className={cn('size-4', favorite && 'fill-danger-500 text-danger-500')}
            aria-hidden
          />
          {favorite ? 'Saxlanılıb' : 'Saxla'}
        </Button>

        <Button variant="tertiary" onClick={share} aria-label="Elanı paylaş">
          {copied ? (
            <>
              <Check className="size-4" aria-hidden />
              Kopyalandı
            </>
          ) : (
            <>
              <Share2 className="size-4" aria-hidden />
              Paylaş
            </>
          )}
        </Button>
      </div>

      {notice && (
        <p role="status" className="text-sm text-stone-600">
          {notice}
        </p>
      )}

      <ReportButton
        targetType={ReportTarget.LISTING}
        targetId={listingId}
        targetLabel={title}
      />
    </div>
  );
}
