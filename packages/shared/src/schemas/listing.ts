/**
 * Əmlak və elan sxemləri.
 *
 * Property (fiziki obyekt) və Listing (elan) ayrıdır: eyni əmlak zamanla
 * bir neçə dəfə elan edilə bilər, tarixçə itmir.
 *
 * Forma üç bölmədən ibarətdir və sxem də həmin bölgüyə uyğun qurulub:
 *   1. Əsas məlumatlar  → `propertySchema`
 *   2. Yaşayış məlumatları → `listingRulesSchema`
 *   3. Ev xüsusiyyətləri → `amenities`
 */

import { z } from 'zod';
import { LISTING, PRICE } from '../constants';
import { Amenity, GuestRule, ListingStatus, SmokingRule, values } from '../enums';
import { idSchema, moneySchema } from './common';

// ---------------------------------------------------------------------------
// 1. Əsas məlumatlar
// ---------------------------------------------------------------------------

/**
 * Universitetə piyada məsafə — əl ilə göstərilir, routing hesablanmır.
 *
 * `PROXIMITY_MINUTES` yalnız TEZ SEÇİM üçündür, məhdudiyyət deyil. Əvvəl dəyər
 * bu dördlüklə bağlı idi (`z.union` of literals) və "7 dəqiqə" yazmaq mümkün
 * deyildi — ev sahibi məcbur olub yaxın olmayan rəqəm seçirdi, məsafə etiketi
 * isə elanın ən çox yoxlanan məlumatıdır.
 *
 * Yuxarı hədd 180 dəqiqədir: bundan uzağı "yaxınlıq" sayılmır və çox güman
 * səhv yazılıb.
 */
export const PROXIMITY_MINUTES = [5, 10, 15, 30] as const;

/** İstənilən məqbul dəqiqə dəyəri — presetlərlə məhdud deyil. */
export type ProximityMinutes = number;

export const PROXIMITY_MINUTES_MIN = 1;
export const PROXIMITY_MINUTES_MAX = 180;

export const proximitySchema = z.object({
  universityId: idSchema,
  minutes: z
    .number()
    .int('Dəqiqə tam ədəd olmalıdır')
    .min(PROXIMITY_MINUTES_MIN, 'Ən azı 1 dəqiqə')
    .max(PROXIMITY_MINUTES_MAX, 'Çox uzaqdır — 180 dəqiqəyə qədər yazın'),
});
export type ProximityInput = z.infer<typeof proximitySchema>;

export const propertySchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(LISTING.TITLE_MIN, 'Başlıq çox qısadır')
      .max(140, 'Başlıq çox uzundur'),
    cityId: idSchema,
    districtId: idSchema.nullish(),
    /** Dəqiq ünvan — yalnız sahibi və admin görür. */
    address: z.string().trim().max(240, 'Ünvan çox uzundur').nullish(),

    price: moneySchema,
    utilitiesIncluded: z.boolean().default(false),
    deposit: z.number().int().min(0).max(PRICE.MAX).nullish(),

    roomCount: z.number().int().min(1).max(LISTING.ROOM_COUNT_MAX),
    vacantRoomCount: z.number().int().min(0).max(LISTING.ROOM_COUNT_MAX),
    currentOccupantsCount: z.number().int().min(0).max(20),

    latitude: z.number().min(-90).max(90).nullish(),
    longitude: z.number().min(-180).max(180).nullish(),

    nearbyUniversities: z.array(proximitySchema).max(6).default([]),
  })
  .refine((d) => d.vacantRoomCount <= d.roomCount, {
    message: 'Boş otaq sayı ümumi otaq sayından çox ola bilməz',
    path: ['vacantRoomCount'],
  });
export type PropertyInput = z.infer<typeof propertySchema>;

// ---------------------------------------------------------------------------
// 2. Yaşayış məlumatları  +  3. Ev xüsusiyyətləri
// ---------------------------------------------------------------------------

export const listingRulesSchema = z
  .object({
    description: z
      .string()
      .trim()
      .min(LISTING.DESCRIPTION_MIN, 'Təsviri bir az ətraflı yazın')
      .max(LISTING.DESCRIPTION_MAX, 'Təsvir çox uzundur'),

    suitableForStudents: z.boolean().default(true),
    suitableForWomen: z.boolean().default(true),
    suitableForMen: z.boolean().default(true),
    isMixed: z.boolean().default(false),

    petsAllowed: z.boolean().default(false),
    smokingRule: z.enum(values(SmokingRule)).default(SmokingRule.QADAGANDIR),
    guestRules: z.enum(values(GuestRule)).default(GuestRule.RAZILASMAQLA),

    amenities: z.array(z.enum(values(Amenity))).max(10).default([]),
  })
  .refine((d) => d.suitableForWomen || d.suitableForMen, {
    message: 'Ən azı bir seçim aktiv olmalıdır',
    path: ['suitableForWomen'],
  })
  .refine((d) => !d.isMixed || (d.suitableForWomen && d.suitableForMen), {
    message: '"Qarışıq" seçimi həm qadın, həm kişi uyğunluğu tələb edir',
    path: ['isMixed'],
  });
export type ListingRulesInput = z.infer<typeof listingRulesSchema>;

// ---------------------------------------------------------------------------
// Yaratma və redaktə
// ---------------------------------------------------------------------------

/**
 * Elan yaradılanda əmlak və elan bir tranzaksiyada yazılır.
 * Nəticə HƏMİŞƏ `PENDING` statusu ilə saxlanılır — moderasiyadan keçməmiş
 * elan heç vaxt aktiv olmur.
 */
export const createListingSchema = z.object({
  property: propertySchema,
  listing: listingRulesSchema,
  /** Yükləmə əvvəlcədən aparılıbsa, şəkil id-ləri sıra ilə göndərilir. */
  imageIds: z.array(idSchema).max(LISTING.IMAGES_MAX).default([]),
});
export type CreateListingInput = z.infer<typeof createListingSchema>;

export const updateListingSchema = z.object({
  property: propertySchema.innerType().partial().optional(),
  listing: listingRulesSchema.innerType().innerType().partial().optional(),
});
export type UpdateListingInput = z.infer<typeof updateListingSchema>;

/**
 * Şəkil sıralaması.
 * İlk şəkil (sortOrder = 0) avtomatik cover olur — ayrıca "cover seç" yoxdur,
 * sıralamanı dəyişmək kifayətdir.
 */
export const listingImageOrderSchema = z.object({
  imageIds: z
    .array(idSchema)
    .min(LISTING.IMAGES_MIN, 'Ən azı bir şəkil olmalıdır')
    .max(LISTING.IMAGES_MAX, `Ən çox ${LISTING.IMAGES_MAX} şəkil ola bilər`),
});
export type ListingImageOrderInput = z.infer<typeof listingImageOrderSchema>;

// ---------------------------------------------------------------------------
// Cavab tipləri
// ---------------------------------------------------------------------------

export interface ListingImageDto {
  id: string;
  url: string;
  thumbUrl: string | null;
  isCover: boolean;
  sortOrder: number;
}

export interface ProximityDto {
  universityId: string;
  universityName: string;
  universityShortName: string | null;
  minutes: ProximityMinutes;
}

/** Elan kartı üçün lazım olan minimum məlumat. */
export interface ListingSummaryDto {
  id: string;
  slug: string;
  title: string;
  status: ListingStatus;
  cityName: string;
  districtName: string | null;
  price: number;
  utilitiesIncluded: boolean;
  roomCount: number;
  vacantRoomCount: number;
  coverImageUrl: string | null;
  suitableForStudents: boolean;
  amenities: Amenity[];
  /** Ən yaxın universitet — kartda "BDU-ya 10 dəq" kimi göstərilir. */
  nearestUniversity: ProximityDto | null;
  publishedAt: string | null;
  isFavorite?: boolean;
}

export interface ListingDetailDto extends ListingSummaryDto {
  /**
   * Taksonomiya id-ləri.
   *
   * Kart üçün ad kifayətdir, amma REDAKTƏ forması `<select>`-i ancaq id ilə
   * doldura bilir. Adı id-yə geri çevirmək (ad → siyahıda axtar) eyni adlı iki
   * rayonda səhv nəticə verir, ona görə id birbaşa cavabdadır.
   */
  cityId: string;
  districtId: string | null;
  description: string | null;
  /** Yalnız sahibi və admin üçün doldurulur. */
  address: string | null;
  deposit: number | null;
  currentOccupantsCount: number;
  suitableForWomen: boolean;
  suitableForMen: boolean;
  isMixed: boolean;
  petsAllowed: boolean;
  smokingRule: SmokingRule;
  guestRules: GuestRule;
  latitude: number | null;
  longitude: number | null;
  nearbyUniversities: ProximityDto[];
  images: ListingImageDto[];
  viewCount: number;
  owner: {
    id: string;
    fullName: string;
    avatarUrl: string | null;
    isCompany: boolean;
    companyName: string | null;
    phoneVerified: boolean;
    /**
     * Sahibin nömrəsi VARMI — nömrənin ÖZÜ deyil.
     *
     * `phoneVerified` bu sualın cavabı deyil: nömrə əlavə edib təsdiqləməmiş
     * sahibin də nömrəsi açıla bilir (`revealContact` təsdiqə baxmır). Client
     * "nömrə göstər" yoxsa "mesaj yaz" təklif edəcəyini bu sahəyə görə seçir.
     * Nömrənin özü heç vaxt bu cavabda gəlmir.
     */
    hasPhone: boolean;
    ownerVerified: boolean;
    memberSince: string;
    /** Yalnız əlaqə sorğusu qəbul ediləndən sonra doldurulur. */
    phone: string | null;
  };
}

/** Şəkil yüklənəndən sonra qaytarılan qeyd. */
export interface UploadedImageDto {
  id: string;
  url: string;
  thumbUrl: string | null;
  width: number;
  height: number;
  sizeBytes: number;
}

/** Ana səhifədəki şəhər kartları üçün — şəhər + aktiv elan sayı. */
export interface CityStatsDto {
  cityId: string;
  slug: string;
  name: string;
  activeListings: number;
}

/**
 * Ana səhifədəki "ən çox axtarılan ərazilər" kartları üçün.
 *
 * Qiymət aralığı NULL ola bilər və bu qəsdəndir: rayonda hələ aktiv elan
 * yoxdursa uydurma rəqəm göstərmək əvəzinə sadəcə rayonun adı görünür.
 * Uydurulmuş statistika marketplace-in etibarını ilk gündən sıfırlayır.
 */
export interface DistrictStatsDto {
  districtId: string;
  slug: string;
  name: string;
  citySlug: string;
  cityName: string;
  activeListings: number;
  /** Qəpiklə. Aktiv elan yoxdursa null. */
  priceMin: number | null;
  priceMax: number | null;
}
