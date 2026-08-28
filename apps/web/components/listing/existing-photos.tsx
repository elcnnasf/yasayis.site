'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ArrowLeft, ArrowRight, Star, X } from 'lucide-react';
import { LISTING, type ListingImageDto } from '@yasayis/shared';
import { api, messageOf } from '@/lib/api-client';
import { cn } from '@/lib/cn';

/**
 * Artıq yüklənmiş şəkillərin idarəsi (yalnız redaktə rejimində).
 *
 * `PATCH /listings/:id/images` və `DELETE /listings/:id/images/:imageId`
 * endpoint-ləri əvvəldən var idi, amma heç bir ekran onları çağırmırdı: elan
 * yaradıldıqdan sonra səhv şəkli silmək və ya əsas şəkli dəyişmək mümkün deyildi.
 *
 * Sıralama serverə DƏRHAL yazılır, "saxla" düyməsi gözlənilmir: forma
 * mətnindən fərqli olaraq şəkil əməliyyatı ayrıca endpoint-dir və onu
 * formanın göndərilməsinə bağlamaq yarımçıq vəziyyət yaradardı.
 *
 * Sonuncu şəkil silinmir — şəkilsiz elan axtarışda ümumiyyətlə görünmür və
 * ev sahibi bunu bilmədən elanını gizlədə bilər.
 */
export function ExistingPhotos({
  listingId,
  images,
  onChange,
}: {
  listingId: string;
  images: ListingImageDto[];
  onChange: (next: ListingImageDto[]) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remove = async (imageId: string) => {
    if (images.length <= LISTING.IMAGES_MIN) {
      setError('Elanda ən azı bir şəkil qalmalıdır. Əvvəlcə yenisini əlavə edin.');
      return;
    }

    const previous = images;
    setBusy(true);
    setError(null);
    onChange(images.filter((i) => i.id !== imageId));

    try {
      await api.delete(`/listings/${listingId}/images/${imageId}`);
    } catch (e) {
      onChange(previous);
      setError(messageOf(e, 'Şəkil silinmədi. Bir azdan yenidən cəhd edin.'));
    }

    setBusy(false);
  };

  const move = async (imageId: string, direction: -1 | 1) => {
    const index = images.findIndex((i) => i.id === imageId);
    const next = index + direction;
    if (index < 0 || next < 0 || next >= images.length) return;

    const previous = images;
    const reordered = [...images];
    [reordered[index], reordered[next]] = [reordered[next]!, reordered[index]!];
    onChange(reordered);

    setBusy(true);
    setError(null);

    try {
      await api.patch(`/listings/${listingId}/images`, {
        imageIds: reordered.map((i) => i.id),
      });
    } catch (e) {
      onChange(previous);
      setError(messageOf(e, 'Sıralama saxlanılmadı. Bir azdan yenidən cəhd edin.'));
    }

    setBusy(false);
  };

  if (images.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-semibold text-stone-800">Mövcud şəkillər</p>
        <p className="tabular text-2xs text-stone-500">
          {images.length} / {LISTING.IMAGES_MAX}
        </p>
      </div>

      <p className="text-2xs leading-relaxed text-stone-500">
        Birinci şəkil elanın əsas şəklidir. Dəyişikliklər dərhal saxlanılır.
      </p>

      {error && (
        <p role="alert" className="text-sm text-danger-600">
          {error}
        </p>
      )}

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {images.map((image, index) => (
          <li
            key={image.id}
            className={cn(
              'relative overflow-hidden rounded-[var(--radius-input)] border bg-stone-100',
              index === 0 ? 'border-forest-600' : 'border-stone-200',
            )}
          >
            <div className="relative aspect-[4/3]">
              <Image
                src={image.thumbUrl ?? image.url}
                alt={`Şəkil ${index + 1}`}
                fill
                sizes="200px"
                className="object-cover"
              />
            </div>

            {index === 0 && (
              <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-[var(--radius-chip)] bg-forest-600 px-2 py-0.5 text-2xs font-semibold text-white">
                <Star className="size-3" aria-hidden />
                Əsas şəkil
              </span>
            )}

            <button
              type="button"
              disabled={busy}
              onClick={() => void remove(image.id)}
              aria-label={`${index + 1}-ci şəkli sil`}
              className="absolute right-2 top-2 grid size-7 place-items-center rounded-full bg-white/90 text-stone-700 shadow-sm transition-colors hover:bg-white hover:text-danger-600 disabled:opacity-40"
            >
              <X className="size-4" aria-hidden />
            </button>

            <div className="flex items-center justify-between gap-1 bg-white px-2 py-1.5">
              <button
                type="button"
                disabled={busy || index === 0}
                onClick={() => void move(image.id, -1)}
                aria-label={`${index + 1}-ci şəkli əvvələ keçir`}
                className="grid size-7 place-items-center rounded-md text-stone-600 hover:bg-stone-100 disabled:opacity-30"
              >
                <ArrowLeft className="size-4" aria-hidden />
              </button>
              <span className="tabular text-2xs text-stone-500">{index + 1}</span>
              <button
                type="button"
                disabled={busy || index === images.length - 1}
                onClick={() => void move(image.id, 1)}
                aria-label={`${index + 1}-ci şəkli sonraya keçir`}
                className="grid size-7 place-items-center rounded-md text-stone-600 hover:bg-stone-100 disabled:opacity-30"
              >
                <ArrowRight className="size-4" aria-hidden />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
