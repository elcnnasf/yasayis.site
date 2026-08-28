/**
 * Domen enum-ları — Prisma sxeminin güzgüsü.
 *
 * `apps/web` heç vaxt Prisma-nı import etmir, ona görə vahid mənbə buradır.
 * Prisma sxemi dəyişəndə bu fayl da dəyişməlidir.
 */

export const UserStatus = {
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
  DELETED: 'DELETED',
} as const;
export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus];

export const OtpPurpose = {
  PHONE_VERIFY: 'PHONE_VERIFY',
  PASSWORD_RESET: 'PASSWORD_RESET',
  LOGIN: 'LOGIN',
} as const;
export type OtpPurpose = (typeof OtpPurpose)[keyof typeof OtpPurpose];

// --- Tələbə profili -------------------------------------------------------

export const Lifestyle = {
  SAKIT: 'SAKIT',
  SOSIAL: 'SOSIAL',
  FERQI_YOXDUR: 'FERQI_YOXDUR',
} as const;
export type Lifestyle = (typeof Lifestyle)[keyof typeof Lifestyle];

export const SmokingHabit = {
  CEKMIREM: 'CEKMIREM',
  CEKIREM: 'CEKIREM',
  FERQI_YOXDUR: 'FERQI_YOXDUR',
} as const;
export type SmokingHabit = (typeof SmokingHabit)[keyof typeof SmokingHabit];

export const PetsAttitude = {
  SEVIREM: 'SEVIREM',
  PROBLEM_DEYIL: 'PROBLEM_DEYIL',
  ISTEMIREM: 'ISTEMIREM',
} as const;
export type PetsAttitude = (typeof PetsAttitude)[keyof typeof PetsAttitude];

export const GenderPreference = {
  QADIN: 'QADIN',
  KISI: 'KISI',
  FERQI_YOXDUR: 'FERQI_YOXDUR',
} as const;
export type GenderPreference = (typeof GenderPreference)[keyof typeof GenderPreference];

export const LookingFor = {
  EV: 'EV',
  OTAQ: 'OTAQ',
  OTAQ_YOLDASI: 'OTAQ_YOLDASI',
  QERARSIZ: 'QERARSIZ',
} as const;
export type LookingFor = (typeof LookingFor)[keyof typeof LookingFor];

// --- Elan ------------------------------------------------------------------

export const ListingStatus = {
  PENDING: 'PENDING',
  ACTIVE: 'ACTIVE',
  REJECTED: 'REJECTED',
  EXPIRED: 'EXPIRED',
  SUSPENDED: 'SUSPENDED',
} as const;
export type ListingStatus = (typeof ListingStatus)[keyof typeof ListingStatus];

export const SmokingRule = {
  ICAZELIDIR: 'ICAZELIDIR',
  BALKONDA: 'BALKONDA',
  QADAGANDIR: 'QADAGANDIR',
} as const;
export type SmokingRule = (typeof SmokingRule)[keyof typeof SmokingRule];

export const GuestRule = {
  SERBEST: 'SERBEST',
  RAZILASMAQLA: 'RAZILASMAQLA',
  QADAGANDIR: 'QADAGANDIR',
} as const;
export type GuestRule = (typeof GuestRule)[keyof typeof GuestRule];

export const Amenity = {
  WIFI: 'WIFI',
  KOMBI: 'KOMBI',
  KONDISIONER: 'KONDISIONER',
  PALTARYUYAN: 'PALTARYUYAN',
  SOYUDUCU: 'SOYUDUCU',
  MEBEL: 'MEBEL',
  LIFT: 'LIFT',
  PARKINQ: 'PARKINQ',
  BALKON: 'BALKON',
  /** Metro şəbəkəsi olan şəhərlərdə (hazırda yalnız Bakı) mənalıdır. */
  METROYA_YAXIN: 'METROYA_YAXIN',
} as const;
export type Amenity = (typeof Amenity)[keyof typeof Amenity];

// --- Qarşılıqlı əlaqə ------------------------------------------------------

export const FavoriteTarget = {
  LISTING: 'LISTING',
  ROOMMATE: 'ROOMMATE',
} as const;
export type FavoriteTarget = (typeof FavoriteTarget)[keyof typeof FavoriteTarget];

export const ReportTarget = {
  LISTING: 'LISTING',
  USER: 'USER',
} as const;
export type ReportTarget = (typeof ReportTarget)[keyof typeof ReportTarget];

export const ReportReason = {
  SAXTA_ELAN: 'SAXTA_ELAN',
  YANLIS_MELUMAT: 'YANLIS_MELUMAT',
  ARTIQ_KIRAYEDIR: 'ARTIQ_KIRAYEDIR',
  SPAM: 'SPAM',
  /** Otaq yoldaşı təhlükəsizliyi üçün kritik səbəb. */
  SUBHELI_DAVRANIS: 'SUBHELI_DAVRANIS',
  TEHQIREDICI: 'TEHQIREDICI',
  DIGER: 'DIGER',
} as const;
export type ReportReason = (typeof ReportReason)[keyof typeof ReportReason];

export const ReportStatus = {
  OPEN: 'OPEN',
  REVIEWING: 'REVIEWING',
  RESOLVED: 'RESOLVED',
  DISMISSED: 'DISMISSED',
} as const;
export type ReportStatus = (typeof ReportStatus)[keyof typeof ReportStatus];

/**
 * Bu siyahı `schema.prisma`-dakı `NotificationType` ilə TAM üst-üstə düşməlidir.
 * Üç dəyər burada əskik idi (`YENI_UYGUN_OTAQ_YOLDASI`, `ELAN_YENILENDI`,
 * `QIYMET_DEYISDI`); API onları bazaya yazırdı, web isə etiket tapa bilmirdi və
 * bildirişin başlığı boş görünürdü.
 */
export const NotificationType = {
  ELAN_TESDIQLENDI: 'ELAN_TESDIQLENDI',
  ELAN_REDD_EDILDI: 'ELAN_REDD_EDILDI',
  ELAN_MUDDETI_BITIR: 'ELAN_MUDDETI_BITIR',
  YENI_UYGUN_ELAN: 'YENI_UYGUN_ELAN',
  YENI_UYGUN_OTAQ_YOLDASI: 'YENI_UYGUN_OTAQ_YOLDASI',
  ELAN_YENILENDI: 'ELAN_YENILENDI',
  QIYMET_DEYISDI: 'QIYMET_DEYISDI',
  TELEFON_TESDIQLENDI: 'TELEFON_TESDIQLENDI',
  PROFIL_TESDIQLENDI: 'PROFIL_TESDIQLENDI',
  SIKAYET_NETICESI: 'SIKAYET_NETICESI',
  SISTEM: 'SISTEM',
} as const;
export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType];

export const VerificationType = {
  STUDENT: 'STUDENT',
  OWNER: 'OWNER',
  PHONE: 'PHONE',
} as const;
export type VerificationType = (typeof VerificationType)[keyof typeof VerificationType];

export const VerificationStatus = {
  NONE: 'NONE',
  PENDING: 'PENDING',
  VERIFIED: 'VERIFIED',
  REJECTED: 'REJECTED',
} as const;
export type VerificationStatus = (typeof VerificationStatus)[keyof typeof VerificationStatus];

/** `z.enum(values(X))` üçün köməkçi. */
export const values = <T extends Record<string, string>>(o: T) =>
  Object.values(o) as [T[keyof T], ...T[keyof T][]];
