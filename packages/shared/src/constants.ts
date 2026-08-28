/**
 * Domen sabitləri — limitlər, hədlər, qaydalar.
 *
 * Sərt kodlanmış rəqəm birbaşa service və ya komponent içində yazılmır;
 * hamısı buradan gəlir ki, dəyişəndə tək yerdə dəyişsin.
 */

/** Pul həmişə qəpiklə (Int) saxlanılır. 1 ₼ = 100 qəpik. */
export const QEPIK_PER_MANAT = 100;

export const PRICE = {
  /** 10 ₼ — açıq şəkildə səhv olan aşağı qiymətləri kəsir */
  MIN: 10 * QEPIK_PER_MANAT,
  /** 20 000 ₼ */
  MAX: 20_000 * QEPIK_PER_MANAT,
} as const;

export const LISTING = {
  TITLE_MIN: 10,
  TITLE_MAX: 120,
  DESCRIPTION_MIN: 30,
  DESCRIPTION_MAX: 4000,
  IMAGES_MIN: 1,
  IMAGES_MAX: 15,
  IMAGE_MAX_BYTES: 5 * 1024 * 1024,
  IMAGE_MIME_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'image/heic'] as const,
  /** Serverdə bu enə qədər kiçildilir. */
  IMAGE_MAX_WIDTH: 1920,
  THUMB_WIDTH: 480,
  /** Elan neçə gündən sonra avtomatik EXPIRED olur */
  EXPIRY_DAYS: 30,
  /** Müddəti bitməzdən neçə gün əvvəl xatırlatma göndərilir */
  EXPIRY_REMINDER_DAYS: 3,
  ROOM_COUNT_MAX: 10,
  AREA_MAX: 1000,
  FLOOR_MAX: 60,
} as const;

export const PROFILE = {
  FULL_NAME_MIN: 3,
  FULL_NAME_MAX: 80,
  BIO_MAX: 1000,
  ABOUT_MAX: 1000,
  STUDY_YEAR_MIN: 1,
  STUDY_YEAR_MAX: 8,
  /** Platformadan istifadə üçün minimal yaş */
  MIN_AGE: 16,
  MAX_AGE: 100,
} as const;

export const CONTACT = {
  MESSAGE_MIN: 10,
  MESSAGE_MAX: 500,
} as const;

export const REPORT = {
  COMMENT_MAX: 500,
} as const;

export const PAGINATION = {
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 50,
} as const;

/** Rate limit-lər: [neçə dəfə, neçə saniyədə] */
export const RATE_LIMIT = {
  LOGIN: { limit: 5, ttlSec: 60 },
  OTP_REQUEST: { limit: 3, ttlSec: 60 * 60 },
  OTP_VERIFY: { limit: 5, ttlSec: 60 * 10 },
  LISTING_CREATE: { limit: 5, ttlSec: 60 * 60 * 24 },
  CONTACT_REQUEST: { limit: 20, ttlSec: 60 * 60 * 24 },
  REPORT_CREATE: { limit: 10, ttlSec: 60 * 60 * 24 },
} as const;

export const AUTH = {
  PASSWORD_MIN: 8,
  PASSWORD_MAX: 72,
  OTP_LENGTH: 6,
  OTP_TTL_SEC: 5 * 60,
} as const;

/** Azərbaycan mobil nömrəsi: +994 + operator kodu + 7 rəqəm */
export const PHONE_REGEX = /^\+994(10|50|51|55|60|70|77|99)\d{7}$/;

/** Baza valyutası — v1-də yalnız AZN */
export const CURRENCY = 'AZN' as const;
