'use client';

import { useState } from 'react';
import {
  Amenity,
  GuestRule,
  LISTING,
  SmokingRule,
  toManat,
  toQepik,
  type CreateListingInput,
  type ListingDetailDto,
  type ProximityMinutes,
  type UpdateListingInput,
} from '@yasayis/shared';

/**
 * Elan qaralamasının vəziyyəti və yoxlanışı.
 *
 * Formanın özündən AYRILIB, çünki iki fərqli iş var: nə yazılır (bu fayl) və
 * necə göstərilir (`listing-form.tsx`). Ayrı olanda yoxlama qaydalarını
 * oxumaq üçün 600 sətirlik JSX-in içində gəzmək lazım gəlmir.
 *
 * Bütün sahələr STRING kimi saxlanılır, rəqəm kimi yox. Səbəb: `<input>` boş
 * qalanda `Number('')` sıfır verir və istifadəçi heç nə yazmadığı halda
 * "qiymət 0 AZN" göndərilir. String-də boşluq boşluq olaraq qalır və yoxlama
 * onu tuta bilir.
 */

export interface DraftState {
  // Addım 1 — əmlak
  title: string;
  cityId: string;
  districtId: string;
  address: string;
  price: string;
  deposit: string;
  utilitiesIncluded: boolean;
  roomCount: string;
  vacantRoomCount: string;
  currentOccupantsCount: string;
  /**
   * Xəritədən seçilmiş nöqtə. STRING deyil, çünki mətn sahəsindən gəlmir —
   * yalnız xəritə klikindən gəlir və ya ümumiyyətlə yoxdur.
   */
  coords: { lat: number; lng: number } | null;

  // Addım 2 — təsvir və qaydalar
  description: string;
  suitableForStudents: boolean;
  suitableForWomen: boolean;
  suitableForMen: boolean;
  petsAllowed: boolean;
  smokingRule: SmokingRule;
  guestRules: GuestRule;
  amenities: Amenity[];
  proximities: { universityId: string; minutes: ProximityMinutes }[];
}

const INITIAL: DraftState = {
  title: '',
  cityId: '',
  districtId: '',
  address: '',
  price: '',
  deposit: '',
  utilitiesIncluded: false,
  roomCount: '2',
  vacantRoomCount: '1',
  currentOccupantsCount: '0',
  coords: null,

  description: '',
  suitableForStudents: true,
  suitableForWomen: true,
  suitableForMen: true,
  petsAllowed: false,
  smokingRule: SmokingRule.QADAGANDIR,
  guestRules: GuestRule.RAZILASMAQLA,
  // Tələbənin ən çox axtardığı iki xüsusiyyət əvvəlcədən seçilidir —
  // əksər elanda onsuz da var və ev sahibi hər dəfə eyni iki qutunu
  // işarələməkdən yorulur.
  amenities: [Amenity.WIFI, Amenity.MEBEL],
  proximities: [],
};

/** Sahə adı → xəta mətni. Addım nömrəsi ilə deyil, sahə adı ilə saxlanılır. */
export type Errors = Partial<Record<keyof DraftState | 'photos', string>>;

/** Hansı sahələr hansı addıma aiddir — "irəli" düyməsi buna görə bağlanır. */
const STEP_FIELDS: (keyof DraftState | 'photos')[][] = [
  ['title', 'cityId', 'price', 'roomCount', 'vacantRoomCount', 'currentOccupantsCount'],
  ['description', 'suitableForWomen'],
  ['photos'],
];

export function useListingDraft(initial?: DraftState) {
  const [draft, setDraft] = useState<DraftState>(initial ?? INITIAL);

  const set = <K extends keyof DraftState>(key: K, value: DraftState[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const reset = () => setDraft(initial ?? INITIAL);

  return { draft, set, setDraft, reset };
}

/**
 * Mövcud elandan qaralama qurur — redaktə rejimi üçün.
 *
 * Rəqəmlər qəpikdən manata çevrilir və STRING-ə keçir: forma bütün ədədləri
 * mətn kimi saxlayır (yuxarıdakı izaha bax), ona görə çevirmə burada bir dəfə
 * aparılır və komponentdə ədəd tipi qarışmır.
 */
export function draftFromListing(listing: ListingDetailDto): DraftState {
  return {
    title: listing.title,
    cityId: listing.cityId ?? '',
    districtId: listing.districtId ?? '',
    address: listing.address ?? '',
    price: String(toManat(listing.price)),
    deposit: listing.deposit != null ? String(toManat(listing.deposit)) : '',
    utilitiesIncluded: listing.utilitiesIncluded,
    roomCount: String(listing.roomCount),
    vacantRoomCount: String(listing.vacantRoomCount),
    currentOccupantsCount: String(listing.currentOccupantsCount),
    coords:
      listing.latitude !== null && listing.longitude !== null
        ? { lat: listing.latitude, lng: listing.longitude }
        : null,

    description: listing.description ?? '',
    suitableForStudents: listing.suitableForStudents,
    suitableForWomen: listing.suitableForWomen,
    suitableForMen: listing.suitableForMen,
    petsAllowed: listing.petsAllowed,
    smokingRule: listing.smokingRule,
    guestRules: listing.guestRules,
    amenities: listing.amenities,
    proximities: listing.nearbyUniversities.map((p) => ({
      universityId: p.universityId,
      minutes: p.minutes,
    })),
  };
}

/**
 * Redaktə yükü.
 *
 * `imageIds` YOXDUR: şəkillər ayrıca endpoint-lərlə idarə olunur və onları
 * bu sorğuya qarışdırmaq "yarımçıq saxlandı" halları yaradardı.
 */
export function toUpdateInput(draft: DraftState): UpdateListingInput {
  const { property, listing } = toCreateInput(draft);
  return { property, listing };
}

/**
 * Bütün formanın yoxlanışı.
 *
 * Server sxemi (`createListingSchema`) yenə də son sözü deyir — bu, yalnız
 * istifadəçini şəbəkəyə çıxmadan xəbərdar etmək üçündür. Mətnlər server
 * mesajları ilə eyni dildədir ki, eyni səhv iki cür səslənməsin.
 */
export function validate(draft: DraftState, photoCount: number): Errors {
  const e: Errors = {};

  const num = (raw: string) => (raw.trim() === '' ? NaN : Number(raw));

  if (draft.title.trim().length < LISTING.TITLE_MIN) {
    e.title = `Başlıq ən azı ${LISTING.TITLE_MIN} simvol olmalıdır`;
  } else if (draft.title.trim().length > LISTING.TITLE_MAX) {
    e.title = 'Başlıq çox uzundur';
  }

  if (!draft.cityId) e.cityId = 'Şəhəri seçin';

  const price = num(draft.price);
  if (!Number.isFinite(price) || price <= 0) {
    e.price = 'Aylıq qiyməti yazın';
  }

  if (draft.deposit.trim() !== '') {
    const deposit = num(draft.deposit);
    if (!Number.isFinite(deposit) || deposit < 0) e.deposit = 'Depozit düzgün deyil';
  }

  const rooms = num(draft.roomCount);
  if (!Number.isFinite(rooms) || rooms < 1 || rooms > LISTING.ROOM_COUNT_MAX) {
    e.roomCount = `1 ilə ${LISTING.ROOM_COUNT_MAX} arasında olmalıdır`;
  }

  const vacant = num(draft.vacantRoomCount);
  if (!Number.isFinite(vacant) || vacant < 0) {
    e.vacantRoomCount = 'Boş otaq sayını yazın';
  } else if (Number.isFinite(rooms) && vacant > rooms) {
    e.vacantRoomCount = 'Boş otaq sayı ümumi otaq sayından çox ola bilməz';
  }

  const occupants = num(draft.currentOccupantsCount);
  if (!Number.isFinite(occupants) || occupants < 0) {
    e.currentOccupantsCount = 'Rəqəm yazın (heç kim yaşamırsa 0)';
  }

  const description = draft.description.trim();
  if (description.length < LISTING.DESCRIPTION_MIN) {
    e.description = `Təsvir ən azı ${LISTING.DESCRIPTION_MIN} simvol olmalıdır`;
  } else if (description.length > LISTING.DESCRIPTION_MAX) {
    e.description = 'Təsvir çox uzundur';
  }

  if (!draft.suitableForWomen && !draft.suitableForMen) {
    e.suitableForWomen = 'Ən azı bir seçim aktiv olmalıdır';
  }

  if (photoCount < LISTING.IMAGES_MIN) {
    e.photos = 'Ən azı bir şəkil əlavə edin';
  }

  return e;
}

/** Cari addımda hələ də açıq qalan xətalar — "Davam et" bununla bağlanır. */
export function errorsForStep(errors: Errors, step: number): Errors {
  const fields = STEP_FIELDS[step] ?? [];
  return Object.fromEntries(
    Object.entries(errors).filter(([key]) => fields.includes(key as keyof DraftState)),
  );
}

/**
 * Qaralamanı API-nin gözlədiyi formaya çevirir.
 *
 * `isMixed` ayrıca soruşulmur: həm qadın, həm kişi uyğun seçilibsə mənzil
 * onsuz da qarışıqdır. Üçüncü qutu qoymaq eyni məlumatı iki yerdən soruşmaq
 * olardı və server sxemi də bu iki sahənin uyğunsuzluğunu rədd edir.
 */
export function toCreateInput(draft: DraftState): CreateListingInput {
  return {
    property: {
      title: draft.title.trim(),
      cityId: draft.cityId,
      districtId: draft.districtId || null,
      address: draft.address.trim() || null,
      price: toQepik(Number(draft.price)),
      utilitiesIncluded: draft.utilitiesIncluded,
      deposit: draft.deposit.trim() ? toQepik(Number(draft.deposit)) : null,
      roomCount: Number(draft.roomCount),
      vacantRoomCount: Number(draft.vacantRoomCount),
      currentOccupantsCount: Number(draft.currentOccupantsCount),
      latitude: draft.coords?.lat ?? null,
      longitude: draft.coords?.lng ?? null,
      nearbyUniversities: draft.proximities,
    },
    listing: {
      description: draft.description.trim(),
      suitableForStudents: draft.suitableForStudents,
      suitableForWomen: draft.suitableForWomen,
      suitableForMen: draft.suitableForMen,
      isMixed: draft.suitableForWomen && draft.suitableForMen,
      petsAllowed: draft.petsAllowed,
      smokingRule: draft.smokingRule,
      guestRules: draft.guestRules,
      amenities: draft.amenities,
    },
    imageIds: [],
  };
}

/** Formanın addımları — `Stepper` və naviqasiya bu siyahıdan oxuyur. */
export const STEPS = [
  { id: 'property', label: 'Əmlak' },
  { id: 'details', label: 'Təsvir və qaydalar' },
  { id: 'photos', label: 'Şəkillər' },
] as const;
