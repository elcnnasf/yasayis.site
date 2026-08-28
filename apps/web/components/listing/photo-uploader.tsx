'use client';

import Image from 'next/image';
import { ArrowLeft, ArrowRight, ImagePlus, Star, X } from 'lucide-react';
import { useRef } from 'react';
import { LISTING } from '@yasayis/shared';
import { cn } from '@/lib/cn';

export interface LocalPhoto {
  id: string;
  file: File;
  previewUrl: string;
}

/**
 * Şəkil seçimi və sıralaması.
 *
 * Birinci şəkil avtomatik cover olur — ayrıca "cover seç" düyməsi yoxdur,
 * şəkli önə sürüşdürmək kifayətdir. Bu, iki ayrı anlayışı (sıra və cover)
 * birinə yığır və istifadəçinin qərar verməli olduğu şeyi azaldır.
 *
 * Sıralama ox düymələri ilədir, sürüşdürmə (drag) ilə deyil: toxunma
 * ekranlarında sürüşdürmə səhifənin skrollu ilə toqquşur və klaviatura ilə
 * ümumiyyətlə işləmir.
 */
export function PhotoUploader({
  photos,
  onAdd,
  onRemove,
  onMove,
  error,
}: {
  photos: LocalPhoto[];
  onAdd: (files: FileList) => void;
  onRemove: (id: string) => void;
  onMove: (id: string, direction: -1 | 1) => void;
  error?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const full = photos.length >= LISTING.IMAGES_MAX;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-semibold text-stone-800">
          Şəkillər <span className="text-danger-500">*</span>
        </p>
        <p className="tabular text-2xs text-stone-500">
          {photos.length} / {LISTING.IMAGES_MAX}
        </p>
      </div>

      {photos.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {photos.map((photo, index) => (
            <li
              key={photo.id}
              className={cn(
                'relative overflow-hidden rounded-[var(--radius-input)] border bg-stone-100',
                index === 0 ? 'border-forest-600' : 'border-stone-200',
              )}
            >
              <div className="relative aspect-[4/3]">
                <Image
                  src={photo.previewUrl}
                  alt={`Şəkil ${index + 1}`}
                  fill
                  sizes="200px"
                  className="object-cover"
                  unoptimized
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
                onClick={() => onRemove(photo.id)}
                aria-label={`${index + 1}-ci şəkli sil`}
                className="absolute right-2 top-2 grid size-7 place-items-center rounded-full bg-white/90 text-stone-700 shadow-sm transition-colors hover:bg-white hover:text-danger-600"
              >
                <X className="size-4" aria-hidden />
              </button>

              <div className="flex items-center justify-between gap-1 bg-white px-2 py-1.5">
                <button
                  type="button"
                  disabled={index === 0}
                  onClick={() => onMove(photo.id, -1)}
                  aria-label={`${index + 1}-ci şəkli əvvələ keçir`}
                  className="grid size-7 place-items-center rounded-md text-stone-600 hover:bg-stone-100 disabled:opacity-30"
                >
                  <ArrowLeft className="size-4" aria-hidden />
                </button>
                <span className="tabular text-2xs text-stone-500">{index + 1}</span>
                <button
                  type="button"
                  disabled={index === photos.length - 1}
                  onClick={() => onMove(photo.id, 1)}
                  aria-label={`${index + 1}-ci şəkli sonraya keçir`}
                  className="grid size-7 place-items-center rounded-md text-stone-600 hover:bg-stone-100 disabled:opacity-30"
                >
                  <ArrowRight className="size-4" aria-hidden />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        disabled={full}
        onClick={() => inputRef.current?.click()}
        className={cn(
          'flex flex-col items-center gap-2 rounded-[var(--radius-input)] border border-dashed px-6 py-8 transition-colors',
          full
            ? 'cursor-not-allowed border-stone-200 text-stone-400'
            : 'border-stone-300 text-stone-600 hover:border-forest-500 hover:text-forest-600',
        )}
      >
        <ImagePlus className="size-6" strokeWidth={1.75} aria-hidden />
        <span className="text-body font-semibold">
          {full ? 'Şəkil limiti doldu' : 'Şəkil əlavə et'}
        </span>
        <span className="text-2xs">
          JPG, PNG, WebP və ya HEIC · hər biri 5 MB-a qədər · ən azı 1, ən çox{' '}
          {LISTING.IMAGES_MAX}
        </span>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept={LISTING.IMAGE_MIME_TYPES.join(',')}
        multiple
        className="sr-only"
        onChange={(e) => {
          if (e.target.files?.length) onAdd(e.target.files);
          // Eyni faylı təkrar seçmək mümkün olsun deyə sıfırlanır.
          e.target.value = '';
        }}
      />

      {error && (
        <p role="alert" className="text-sm text-danger-600">
          {error}
        </p>
      )}
    </div>
  );
}
