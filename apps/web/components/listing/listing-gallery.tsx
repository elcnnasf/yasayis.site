'use client';

import Image from 'next/image';
import { useState } from 'react';
import { ChevronLeft, ChevronRight, ImageOff } from 'lucide-react';
import type { ListingImageDto } from '@yasayis/shared';
import { cn } from '@/lib/cn';

/**
 * Şəkil qalereyası.
 *
 * Mobil-də tam enli tək şəkil; desktopda böyük şəkil + kiçik önbaxışlar.
 * Ox düymələri klaviatura ilə də işləyir — modal lightbox yoxdur, çünki mobil
 * brauzerlərdə geri düyməsi ilə toqquşur.
 *
 * HÜNDÜRLÜK MƏHDUDDUR (`max-h`). Yalnız nisbət versək, geniş ekranda şəkil
 * 700 piksel hündürlüyə çatır: ekranın hamısını tutur, qiymət və "Əlaqə saxla"
 * düyməsi isə qatlanın altında qalır. Elan səhifəsində əsas iş şəkilə baxmaq
 * deyil, qərar verməkdir — şəkil ona xidmət edir, onu əvəz etmir.
 */
export function ListingGallery({
  images,
  title,
}: {
  images: ListingImageDto[];
  title: string;
}) {
  const [index, setIndex] = useState(0);

  if (images.length === 0) {
    return (
      <div className="flex aspect-[16/10] max-h-[20rem] items-center justify-center rounded-[var(--radius-panel)] bg-stone-100 text-stone-400">
        <ImageOff className="size-8" aria-hidden />
        <span className="sr-only">Şəkil yoxdur</span>
      </div>
    );
  }

  const current = images[index] ?? images[0];
  const move = (delta: number) =>
    setIndex((i) => (i + delta + images.length) % images.length);

  return (
    <div className="flex flex-col gap-3">
      {/*
        Şəkil TAM görünür (`object-contain`), kəsilmir.

        Elan səhifəsində şəkil sübutdur: tələbə otağın nə qədər böyük olduğuna
        və pəncərənin haraya baxdığına baxır. `object-cover` kadrın kənarlarını
        kəsir və məhz həmin detalları aparır. Siyahı kartlarında isə əksinə —
        orada bütün kartların eyni ölçüdə olması vacibdir, ona görə orada
        kəsilmə saxlanılır.

        Yanlarda qalan boşluq neytral fonla doldurulur; qutunun hündürlüyü
        `max-h` ilə məhduddur ki, uzun şəkil ekranı tutmasın.
      */}
      <div className="relative flex max-h-[19rem] min-h-[13rem] items-center justify-center overflow-hidden rounded-[var(--radius-panel)] bg-stone-100 sm:max-h-[26rem] sm:min-h-[18rem]">
        {current && (
          <Image
            src={current.url}
            alt={`${title} — şəkil ${index + 1}`}
            width={1200}
            height={900}
            priority
            sizes="(max-width: 1024px) 100vw, 720px"
            className="max-h-[19rem] w-auto max-w-full object-contain sm:max-h-[26rem]"
          />
        )}

        {images.length > 1 && (
          <>
            <GalleryButton side="left" onClick={() => move(-1)} />
            <GalleryButton side="right" onClick={() => move(1)} />
            <p className="tabular absolute bottom-3 right-3 rounded-[var(--radius-chip)] bg-stone-900/70 px-2.5 py-1 text-2xs font-semibold text-white">
              {index + 1} / {images.length}
            </p>
          </>
        )}
      </div>

      {images.length > 1 && (
        <ul className="flex gap-2 overflow-x-auto pb-1">
          {images.map((image, i) => (
            <li key={image.id}>
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`${i + 1}-ci şəkli göstər`}
                aria-current={i === index}
                className={cn(
                  'relative block size-14 shrink-0 overflow-hidden rounded-[0.6rem] border-2 transition-colors sm:size-16',
                  i === index ? 'border-forest-600' : 'border-transparent hover:border-stone-300',
                )}
              >
                <Image
                  src={image.thumbUrl ?? image.url}
                  alt=""
                  fill
                  sizes="64px"
                  className="object-cover"
                />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function GalleryButton({
  side,
  onClick,
}: {
  side: 'left' | 'right';
  onClick: () => void;
}) {
  const Icon = side === 'left' ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={side === 'left' ? 'Əvvəlki şəkil' : 'Növbəti şəkil'}
      className={cn(
        'absolute top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full',
        'bg-white/90 text-stone-800 shadow-sm transition-colors hover:bg-white',
        side === 'left' ? 'left-3' : 'right-3',
      )}
    >
      <Icon className="size-5" aria-hidden />
    </button>
  );
}
