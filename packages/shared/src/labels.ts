/**
 * Enum dəyərlərinin Azərbaycan dilində göstərilən adları.
 * UI-da heç vaxt xam enum dəyəri göstərilmir.
 */

import {
  Amenity,
  FavoriteTarget,
  GenderPreference,
  GuestRule,
  Lifestyle,
  ListingStatus,
  LookingFor,
  NotificationType,
  PetsAttitude,
  ReportReason,
  ReportStatus,
  ReportTarget,
  SmokingHabit,
  SmokingRule,
  VerificationStatus,
  VerificationType,
} from './enums';

export const lifestyleLabels: Record<Lifestyle, string> = {
  [Lifestyle.SAKIT]: 'Sakit',
  [Lifestyle.SOSIAL]: 'Sosial',
  [Lifestyle.FERQI_YOXDUR]: 'Fərqi yoxdur',
};

export const smokingHabitLabels: Record<SmokingHabit, string> = {
  [SmokingHabit.CEKMIREM]: 'Çəkmirəm',
  [SmokingHabit.CEKIREM]: 'Çəkirəm',
  [SmokingHabit.FERQI_YOXDUR]: 'Fərqi yoxdur',
};

export const petsAttitudeLabels: Record<PetsAttitude, string> = {
  [PetsAttitude.SEVIREM]: 'Sevirəm',
  [PetsAttitude.PROBLEM_DEYIL]: 'Problem deyil',
  [PetsAttitude.ISTEMIREM]: 'İstəmirəm',
};

export const genderPreferenceLabels: Record<GenderPreference, string> = {
  [GenderPreference.QADIN]: 'Qadın',
  [GenderPreference.KISI]: 'Kişi',
  [GenderPreference.FERQI_YOXDUR]: 'Fərqi yoxdur',
};

export const lookingForLabels: Record<LookingFor, string> = {
  [LookingFor.EV]: 'Ev',
  [LookingFor.OTAQ]: 'Otaq',
  [LookingFor.OTAQ_YOLDASI]: 'Otaq yoldaşı',
  [LookingFor.QERARSIZ]: 'Hələ qərar verməmişəm',
};

export const listingStatusLabels: Record<ListingStatus, string> = {
  [ListingStatus.PENDING]: 'Yoxlanılır',
  [ListingStatus.ACTIVE]: 'Aktiv',
  [ListingStatus.REJECTED]: 'Rədd edilib',
  [ListingStatus.EXPIRED]: 'Müddəti bitib',
  [ListingStatus.SUSPENDED]: 'Dayandırılıb',
};

export const smokingRuleLabels: Record<SmokingRule, string> = {
  [SmokingRule.ICAZELIDIR]: 'İcazəlidir',
  [SmokingRule.BALKONDA]: 'Yalnız balkonda',
  [SmokingRule.QADAGANDIR]: 'Qadağandır',
};

export const guestRuleLabels: Record<GuestRule, string> = {
  [GuestRule.SERBEST]: 'Sərbəst',
  [GuestRule.RAZILASMAQLA]: 'Razılaşmaqla',
  [GuestRule.QADAGANDIR]: 'Qadağandır',
};

export const amenityLabels: Record<Amenity, string> = {
  [Amenity.WIFI]: 'Wi-Fi / internet',
  [Amenity.KOMBI]: 'Kombi',
  [Amenity.KONDISIONER]: 'Kondisioner',
  [Amenity.PALTARYUYAN]: 'Paltaryuyan',
  [Amenity.SOYUDUCU]: 'Soyuducu',
  [Amenity.MEBEL]: 'Mebel',
  [Amenity.LIFT]: 'Lift',
  [Amenity.PARKINQ]: 'Parkinq',
  [Amenity.BALKON]: 'Balkon',
  [Amenity.METROYA_YAXIN]: 'Metroya yaxın',
};

/** lucide-react ikon adları — UI komponentləri bu adı birbaşa işlədir. */
export const amenityIcons: Record<Amenity, string> = {
  [Amenity.WIFI]: 'wifi',
  [Amenity.KOMBI]: 'flame',
  [Amenity.KONDISIONER]: 'air-vent',
  [Amenity.PALTARYUYAN]: 'washing-machine',
  [Amenity.SOYUDUCU]: 'refrigerator',
  [Amenity.MEBEL]: 'sofa',
  [Amenity.LIFT]: 'move-vertical',
  [Amenity.PARKINQ]: 'car',
  [Amenity.BALKON]: 'fence',
  [Amenity.METROYA_YAXIN]: 'train-front',
};

export const favoriteTargetLabels: Record<FavoriteTarget, string> = {
  [FavoriteTarget.LISTING]: 'Elan',
  [FavoriteTarget.ROOMMATE]: 'Otaq yoldaşı',
};

export const reportTargetLabels: Record<ReportTarget, string> = {
  [ReportTarget.LISTING]: 'Elan',
  [ReportTarget.USER]: 'İstifadəçi',
};

export const reportReasonLabels: Record<ReportReason, string> = {
  [ReportReason.SAXTA_ELAN]: 'Saxta elan və ya profil',
  [ReportReason.YANLIS_MELUMAT]: 'Yanlış məlumat',
  [ReportReason.ARTIQ_KIRAYEDIR]: 'Artıq kirayə verilib',
  [ReportReason.SPAM]: 'Spam',
  [ReportReason.SUBHELI_DAVRANIS]: 'Şübhəli davranış',
  [ReportReason.TEHQIREDICI]: 'Uyğun olmayan məzmun',
  [ReportReason.DIGER]: 'Digər',
};

/**
 * Hədəfə görə səbəb siyahısı.
 *
 * Elan və profil şikayətləri eyni deyil: "artıq kirayə verilib" yalnız elana,
 * "şübhəli davranış" isə əsasən şəxsə aiddir. Səhv siyahı göstərmək
 * moderatorun işini çətinləşdirir və istifadəçini yanlış seçimə itələyir.
 */
export const listingReportReasons: ReportReason[] = [
  ReportReason.SAXTA_ELAN,
  ReportReason.YANLIS_MELUMAT,
  ReportReason.ARTIQ_KIRAYEDIR,
  ReportReason.SPAM,
  ReportReason.TEHQIREDICI,
  ReportReason.DIGER,
];

export const userReportReasons: ReportReason[] = [
  ReportReason.SAXTA_ELAN,
  ReportReason.YANLIS_MELUMAT,
  ReportReason.SUBHELI_DAVRANIS,
  ReportReason.SPAM,
  ReportReason.TEHQIREDICI,
  ReportReason.DIGER,
];

export const reportStatusLabels: Record<ReportStatus, string> = {
  [ReportStatus.OPEN]: 'Yeni',
  [ReportStatus.REVIEWING]: 'Baxılır',
  [ReportStatus.RESOLVED]: 'Həll edilib',
  [ReportStatus.DISMISSED]: 'Rədd edilib',
};

export const notificationLabels: Record<NotificationType, string> = {
  [NotificationType.ELAN_TESDIQLENDI]: 'Elanınız təsdiqləndi',
  [NotificationType.ELAN_REDD_EDILDI]: 'Elanınız rədd edildi',
  [NotificationType.ELAN_MUDDETI_BITIR]: 'Elanınızın müddəti bitmək üzrədir',
  [NotificationType.YENI_UYGUN_ELAN]: 'Axtarışınıza uyğun yeni elan',
  [NotificationType.YENI_UYGUN_OTAQ_YOLDASI]: 'Sizə uyğun yeni otaq yoldaşı',
  [NotificationType.ELAN_YENILENDI]: 'Saxladığınız elan yeniləndi',
  [NotificationType.QIYMET_DEYISDI]: 'Saxladığınız elanın qiyməti dəyişdi',
  [NotificationType.TELEFON_TESDIQLENDI]: 'Telefon nömrəniz təsdiqləndi',
  [NotificationType.PROFIL_TESDIQLENDI]: 'Profiliniz təsdiqləndi',
  [NotificationType.SIKAYET_NETICESI]: 'Şikayətinizin nəticəsi',
  [NotificationType.SISTEM]: 'Sistem bildirişi',
};

export const verificationTypeLabels: Record<VerificationType, string> = {
  [VerificationType.STUDENT]: 'Tələbə statusu',
  [VerificationType.OWNER]: 'Ev sahibi statusu',
  [VerificationType.PHONE]: 'Telefon nömrəsi',
};

export const verificationStatusLabels: Record<VerificationStatus, string> = {
  [VerificationStatus.NONE]: 'Təsdiqlənməyib',
  [VerificationStatus.PENDING]: 'Gözləyir',
  [VerificationStatus.VERIFIED]: 'Təsdiqlənib',
  [VerificationStatus.REJECTED]: 'Rədd edilib',
};
