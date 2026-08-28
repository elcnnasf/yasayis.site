'use client';

import { useRouter } from 'next/navigation';
import { Heart } from 'lucide-react';
import type { FavoriteTarget } from '@yasayis/shared';
import { useFavorite } from '@/lib/favorites';
import { cn } from '@/lib/cn';

/**
 * Ürək düyməsi — kartın şəklinin üstündə.
 *
 * Ayrıca client komponentdir ki, `ListingCard` server komponenti olaraq qala
 * bilsin: SEO səhifələri (şəhər, rayon, universitet) kart siyahılarını serverdə
 * render edir və bütün kartı client-ə keçirmək o səhifələrin HTML-ini boşaldır.
 *
 * Kartın özü linkdir, ona görə düymə `stopPropagation` + `preventDefault` edir —
 * ürəyə basanda elan səhifəsi açılmamalıdır.
 *
 * Qonaq üçün gizlədilmir: gizli düymə "bu funksiya yoxdur" deməkdir. Əvəzində
 * basanda girişə yönləndirilir və qayıdış ünvanı saxlanılır.
 */
export function FavoriteButton({
  target,
  id,
  /** Ekran oxuyucu üçün: "Nərimanovda 2 otaqlı mənzil" */
  label,
  className,
}: {
  target: FavoriteTarget;
  id: string;
  label: string;
  className?: string;
}) {
  const router = useRouter();
  const { isFavorite, guest, toggle } = useFavorite(target, id);

  const onClick = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    if (guest) {
      router.push(`/giris?davam=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    void toggle();
  };

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isFavorite}
      aria-label={
        isFavorite ? `${label} — saxlananlardan çıxar` : `${label} — saxla`
      }
      title={isFavorite ? 'Saxlananlardan çıxar' : 'Saxla'}
      className={cn(
        'grid size-8 place-items-center rounded-full bg-white/90 shadow-[var(--shadow-xs)] backdrop-blur-sm',
        'transition-colors hover:bg-white',
        isFavorite ? 'text-danger-500' : 'text-stone-600 hover:text-danger-500',
        className,
      )}
    >
      <Heart
        className="size-4"
        strokeWidth={1.9}
        // Dolu ürək "saxlanılıb" deməkdir — rəng tək başına kifayət deyil,
        // rəng ayırdetməsi zəif istifadəçilər forma dəyişikliyini görür.
        fill={isFavorite ? 'currentColor' : 'none'}
        aria-hidden
      />
    </button>
  );
}
