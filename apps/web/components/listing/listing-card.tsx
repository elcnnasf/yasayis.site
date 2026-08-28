import Image from 'next/image';
import Link from 'next/link';
import { ImageOff } from 'lucide-react';
import {
  amenityLabels,
  FavoriteTarget,
  formatMonthlyPrice,
  type Amenity,
  type ListingSummaryDto,
} from '@yasayis/shared';
import { FavoriteButton } from '@/components/favorites/favorite-button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/cn';

/**
 * Elan kartı — bütün siyahılarda (axtarış, şəhər səhifəsi, favoritlər) eynidir.
 *
 * Oxunuş sırası qəsdən belədir: ŞƏKİL → BAŞLIQ → YER → QİYMƏT → xüsusiyyətlər.
 * Tələbə əvvəlcə "bura yaşamaq olar?" sualına şəkillə cavab verir, sonra
 * yerini yoxlayır, qiymətə isə ən axırda baxır — və məhz ona görə qiymət tək
 * rəngli elementdir: gözü ora qaytarır.
 *
 * Xüsusiyyətlər çip kimi verilir, tik-siyahı kimi yox: üç qısa çip bir sətirdə
 * oturur və kartın hündürlüyünü sabit saxlayır. Ən çox ÜÇ çip göstərilir —
 * uzun siyahı bütün kartları eyniləşdirir və seçim etməyi çətinləşdirir.
 */

/** Kartda göstərilən imkanların prioriteti: tələbə üçün ən vacibləri öndə. */
const CHIP_PRIORITY: Amenity[] = [
  'WIFI',
  'MEBEL',
  'KOMBI',
  'KONDISIONER',
  'PALTARYUYAN',
  'SOYUDUCU',
  'METROYA_YAXIN',
  'LIFT',
  'PARKINQ',
  'BALKON',
];

const MAX_CHIPS = 3;

export function ListingCard({
  listing,
  className,
}: {
  listing: ListingSummaryDto;
  className?: string;
}) {
  const href = `/elan/${listing.slug}`;

  // "Tələbələr üçün" həmişə birincidir — platformanın əsas süzgəcidir.
  const chips: string[] = [];
  if (listing.suitableForStudents) chips.push('Tələbələr üçün');
  for (const amenity of CHIP_PRIORITY) {
    if (chips.length >= MAX_CHIPS) break;
    if (listing.amenities.includes(amenity)) chips.push(amenityLabels[amenity]);
  }

  const title =
    listing.vacantRoomCount > 0 && listing.vacantRoomCount < listing.roomCount
      ? `${listing.vacantRoomCount} otaq boş`
      : `${listing.roomCount} otaqlı mənzil`;

  return (
    <Card interactive className={cn('group relative flex flex-col overflow-hidden', className)}>
      <Link href={href} className="relative block aspect-[4/3] bg-stone-100">
        {listing.coverImageUrl ? (
          <Image
            src={listing.coverImageUrl}
            alt={listing.title}
            fill
            sizes="(max-width: 640px) 45vw, (max-width: 1280px) 45vw, 300px"
            loading="lazy"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
          />
        ) : (
          <span className="flex h-full items-center justify-center text-stone-400">
            <ImageOff className="size-7" aria-hidden />
            <span className="sr-only">Şəkil yoxdur</span>
          </span>
        )}

      </Link>

      {/*
        Ürək şəklin ÜSTÜNDƏDİR, amma linkin İÇİNDƏ deyil: link içindəki düymə
        HTML-də etibarsızdır və klaviatura ilə naviqasiyanı pozur. Ona görə
        şəkil linki bağlanır, düymə isə kartın öz `relative` sahəsinə oturur.
      */}
      <FavoriteButton
        target={FavoriteTarget.LISTING}
        id={listing.id}
        label={listing.title}
        className="absolute right-2.5 top-2.5"
      />

      {/*
        Mobil-də daxili ölçülər kiçilir: kart artıq tam en tutmur, yan-yana
        iki-üç dənə durur. Şrift və boşluqlar eyni qalsaydı, mətn kartdan
        daşar və qiymət sətri iki sətrə düşərdi. `sm:`-dən yuxarı hər şey
        əvvəlki kimidir.
      */}
      <div className="flex flex-1 flex-col gap-0.5 p-2.5 sm:gap-1 sm:p-3.5">
        <Link
          href={href}
          className="line-clamp-1 text-sm font-semibold text-stone-900 transition-colors hover:text-forest-700 sm:text-body"
        >
          {title}
        </Link>

        <p className="truncate text-2xs text-stone-500 sm:text-sm">
          {listing.districtName
            ? `${listing.districtName}, ${listing.cityName}`
            : listing.cityName}
        </p>

        <p className="tabular text-sm font-bold text-sprout-600 sm:text-body">
          {formatMonthlyPrice(listing.price)}
          {/* "kommunal daxil" dar kartda qiyməti aşağı itələyir — yalnız
              `sm`-dən yuxarı göstərilir. */}
          {listing.utilitiesIncluded && (
            <span className="ml-1.5 hidden text-2xs font-medium text-stone-500 sm:inline">
              kommunal daxil
            </span>
          )}
        </p>

        {/* Mobildə yalnız BİR çip: dar kartda üç çip üç sətrə düşür və
            kartların hündürlüyü bir-birindən fərqlənir. */}
        {chips.length > 0 && (
          <ul className="mt-1 flex flex-wrap gap-1 [&>li:nth-child(n+2)]:hidden sm:mt-1.5 sm:gap-1.5 sm:[&>li:nth-child(n+2)]:block">
            {chips.map((chip) => (
              <li
                key={chip}
                className="rounded-[var(--radius-chip)] bg-stone-100 px-2 py-0.5 text-2xs font-medium text-stone-600"
              >
                {chip}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}
