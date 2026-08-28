/**
 * İlkin taksonomiya məlumatı  (PROMPT A2)
 *
 * Bu fayl YALNIZ seed üçündür — tətbiq kodu heç vaxt buradan oxumur.
 * İşlək sistemdə şəhər, rayon, universitet və ixtisas siyahıları admin
 * panelindən idarə olunur (CRUD API: /api/v1/admin/taxonomy/*).
 * Yeni şəhər əlavə etmək üçün deploy lazım deyil.
 */

export interface CitySeed {
  slug: string;
  name: string;
  nameRu?: string;
  sortOrder: number;
}

export const cities: CitySeed[] = [
  { slug: 'baki', name: 'Bakı', nameRu: 'Баку', sortOrder: 1 },
  { slug: 'gence', name: 'Gəncə', nameRu: 'Гянджа', sortOrder: 2 },
  { slug: 'sumqayit', name: 'Sumqayıt', nameRu: 'Сумгаит', sortOrder: 3 },
  { slug: 'mingecevir', name: 'Mingəçevir', nameRu: 'Мингечевир', sortOrder: 4 },
  { slug: 'lenkeran', name: 'Lənkəran', nameRu: 'Лянкяран', sortOrder: 5 },
  { slug: 'seki', name: 'Şəki', nameRu: 'Шеки', sortOrder: 6 },
  { slug: 'sirvan', name: 'Şirvan', nameRu: 'Ширван', sortOrder: 7 },
  { slug: 'naxcivan', name: 'Naxçıvan', nameRu: 'Нахчыван', sortOrder: 8 },
  { slug: 'qebele', name: 'Qəbələ', sortOrder: 9 },
  { slug: 'quba', name: 'Quba', sortOrder: 10 },
  { slug: 'samaxi', name: 'Şamaxı', sortOrder: 11 },
  { slug: 'agcabedi', name: 'Ağcabədi', sortOrder: 12 },
  { slug: 'berde', name: 'Bərdə', sortOrder: 13 },
  { slug: 'salyan', name: 'Salyan', sortOrder: 14 },
  { slug: 'sabirabad', name: 'Sabirabad', sortOrder: 15 },
  { slug: 'xacmaz', name: 'Xaçmaz', sortOrder: 16 },
];

export interface DistrictSeed {
  citySlug: string;
  slug: string;
  name: string;
  nameRu?: string;
  sortOrder: number;
}

/**
 * Rayonlar yalnız rəsmi inzibati bölgüsü olan şəhərlər üçün verilir.
 * Digər şəhərlərdə əmlak yalnız şəhər səviyyəsində yerləşdirilir
 * (`Property.districtId` nullable-dır).
 */
export const districts: DistrictSeed[] = [
  // Bakı — 12 inzibati rayon
  { citySlug: 'baki', slug: 'binegedi', name: 'Binəqədi', nameRu: 'Бинагади', sortOrder: 1 },
  { citySlug: 'baki', slug: 'xetai', name: 'Xətai', nameRu: 'Хатаи', sortOrder: 2 },
  { citySlug: 'baki', slug: 'xezer', name: 'Xəzər', nameRu: 'Хазар', sortOrder: 3 },
  { citySlug: 'baki', slug: 'qaradag', name: 'Qaradağ', nameRu: 'Гарадаг', sortOrder: 4 },
  { citySlug: 'baki', slug: 'narimanov', name: 'Nərimanov', nameRu: 'Нариманов', sortOrder: 5 },
  { citySlug: 'baki', slug: 'nesimi', name: 'Nəsimi', nameRu: 'Насими', sortOrder: 6 },
  { citySlug: 'baki', slug: 'nizami', name: 'Nizami', nameRu: 'Низами', sortOrder: 7 },
  { citySlug: 'baki', slug: 'pirallahi', name: 'Pirallahı', nameRu: 'Пираллахи', sortOrder: 8 },
  { citySlug: 'baki', slug: 'sabuncu', name: 'Sabunçu', nameRu: 'Сабунчу', sortOrder: 9 },
  { citySlug: 'baki', slug: 'sebail', name: 'Səbail', nameRu: 'Сабаил', sortOrder: 10 },
  { citySlug: 'baki', slug: 'suraxani', name: 'Suraxanı', nameRu: 'Сураханы', sortOrder: 11 },
  { citySlug: 'baki', slug: 'yasamal', name: 'Yasamal', nameRu: 'Ясамал', sortOrder: 12 },

  // Gəncə — 2 inzibati rayon
  { citySlug: 'gence', slug: 'kepez', name: 'Kəpəz', sortOrder: 1 },
  { citySlug: 'gence', slug: 'nizami-gence', name: 'Nizami', sortOrder: 2 },

  // Naxçıvan şəhəri — Babək və Kəngərli qonşu rayonlardır, tələbələr orada da yaşayır
  { citySlug: 'naxcivan', slug: 'babek', name: 'Babək', sortOrder: 1 },
  { citySlug: 'naxcivan', slug: 'kengerli', name: 'Kəngərli', sortOrder: 2 },
];

export interface UniversitySeed {
  citySlug: string | null;
  slug: string;
  name: string;
  shortName: string | null;
  isOther?: boolean;
  sortOrder: number;
}

/**
 * Ən azı 10–15 əsas universitet + "Digər" seçimi.
 * `isOther: true` olan qeyd sistemdə yalnız BİR dənədir və silinə bilməz —
 * onboarding formasında həmişə siyahının sonunda göstərilir.
 */
export const universities: UniversitySeed[] = [
  { citySlug: 'baki', slug: 'bdu', name: 'Bakı Dövlət Universiteti', shortName: 'BDU', sortOrder: 1 },
  { citySlug: 'baki', slug: 'unec', name: 'Azərbaycan Dövlət İqtisad Universiteti', shortName: 'UNEC', sortOrder: 2 },
  { citySlug: 'baki', slug: 'adnsu', name: 'Azərbaycan Dövlət Neft və Sənaye Universiteti', shortName: 'ADNSU', sortOrder: 3 },
  { citySlug: 'baki', slug: 'ada', name: 'ADA Universiteti', shortName: 'ADA', sortOrder: 4 },
  { citySlug: 'baki', slug: 'atu', name: 'Azərbaycan Tibb Universiteti', shortName: 'ATU', sortOrder: 5 },
  { citySlug: 'baki', slug: 'adpu', name: 'Azərbaycan Dövlət Pedaqoji Universiteti', shortName: 'ADPU', sortOrder: 6 },
  { citySlug: 'baki', slug: 'azmiu', name: 'Azərbaycan Memarlıq və İnşaat Universiteti', shortName: 'AzMİU', sortOrder: 7 },
  { citySlug: 'baki', slug: 'aztu', name: 'Azərbaycan Texniki Universiteti', shortName: 'AzTU', sortOrder: 8 },
  { citySlug: 'baki', slug: 'adu', name: 'Azərbaycan Dillər Universiteti', shortName: 'ADU', sortOrder: 9 },
  { citySlug: 'baki', slug: 'bsu', name: 'Bakı Slavyan Universiteti', shortName: 'BSU', sortOrder: 10 },
  { citySlug: 'baki', slug: 'bmu', name: 'Bakı Mühəndislik Universiteti', shortName: 'BMU', sortOrder: 11 },
  { citySlug: 'baki', slug: 'bhos', name: 'Bakı Ali Neft Məktəbi', shortName: 'BHOS', sortOrder: 12 },
  { citySlug: 'baki', slug: 'xezer-universiteti', name: 'Xəzər Universiteti', shortName: 'Xəzər', sortOrder: 13 },
  { citySlug: 'baki', slug: 'admiu', name: 'Azərbaycan Dövlət Mədəniyyət və İncəsənət Universiteti', shortName: 'ADMİU', sortOrder: 14 },
  { citySlug: 'baki', slug: 'atmu', name: 'Azərbaycan Turizm və Menecment Universiteti', shortName: 'ATMU', sortOrder: 15 },
  { citySlug: 'baki', slug: 'maa', name: 'Milli Aviasiya Akademiyası', shortName: 'MAA', sortOrder: 16 },
  { citySlug: 'baki', slug: 'wcu', name: 'Qərbi Kaspi Universiteti', shortName: 'WCU', sortOrder: 17 },

  { citySlug: 'gence', slug: 'gdu', name: 'Gəncə Dövlət Universiteti', shortName: 'GDU', sortOrder: 20 },
  { citySlug: 'gence', slug: 'adau', name: 'Azərbaycan Dövlət Aqrar Universiteti', shortName: 'ADAU', sortOrder: 21 },
  { citySlug: 'sumqayit', slug: 'sdu', name: 'Sumqayıt Dövlət Universiteti', shortName: 'SDU', sortOrder: 22 },
  { citySlug: 'mingecevir', slug: 'mdu', name: 'Mingəçevir Dövlət Universiteti', shortName: 'MDU', sortOrder: 23 },
  { citySlug: 'naxcivan', slug: 'ndu', name: 'Naxçıvan Dövlət Universiteti', shortName: 'NDU', sortOrder: 24 },
  { citySlug: 'lenkeran', slug: 'ldu', name: 'Lənkəran Dövlət Universiteti', shortName: 'LDU', sortOrder: 25 },

  // Həmişə sonda
  { citySlug: null, slug: 'diger', name: 'Digər / siyahıda yoxdur', shortName: null, isOther: true, sortOrder: 9999 },
];

export interface MajorSeed {
  slug: string;
  name: string;
  isOther?: boolean;
  sortOrder: number;
}

export const majors: MajorSeed[] = [
  { slug: 'kompyuter-elmleri', name: 'Kompüter elmləri', sortOrder: 1 },
  { slug: 'informasiya-texnologiyalari', name: 'İnformasiya texnologiyaları', sortOrder: 2 },
  { slug: 'kompyuter-muhendisliyi', name: 'Kompüter mühəndisliyi', sortOrder: 3 },
  { slug: 'iqtisadiyyat', name: 'İqtisadiyyat', sortOrder: 4 },
  { slug: 'maliyye', name: 'Maliyyə', sortOrder: 5 },
  { slug: 'menecment', name: 'Menecment', sortOrder: 6 },
  { slug: 'marketinq', name: 'Marketinq', sortOrder: 7 },
  { slug: 'muhasibat', name: 'Mühasibat uçotu', sortOrder: 8 },
  { slug: 'huquqsunasliq', name: 'Hüquqşünaslıq', sortOrder: 9 },
  { slug: 'beynelxalq-munasibetler', name: 'Beynəlxalq münasibətlər', sortOrder: 10 },
  { slug: 'tibb', name: 'Müalicə işi (tibb)', sortOrder: 11 },
  { slug: 'stomatologiya', name: 'Stomatologiya', sortOrder: 12 },
  { slug: 'eczaciliq', name: 'Əczaçılıq', sortOrder: 13 },
  { slug: 'neft-qaz-muhendisliyi', name: 'Neft-qaz mühəndisliyi', sortOrder: 14 },
  { slug: 'insaat-muhendisliyi', name: 'İnşaat mühəndisliyi', sortOrder: 15 },
  { slug: 'memarliq', name: 'Memarlıq', sortOrder: 16 },
  { slug: 'elektrik-muhendisliyi', name: 'Elektrik mühəndisliyi', sortOrder: 17 },
  { slug: 'mexanika-muhendisliyi', name: 'Mexanika mühəndisliyi', sortOrder: 18 },
  { slug: 'filologiya', name: 'Filologiya', sortOrder: 19 },
  { slug: 'tercume', name: 'Tərcümə', sortOrder: 20 },
  { slug: 'psixologiya', name: 'Psixologiya', sortOrder: 21 },
  { slug: 'pedaqogika', name: 'Pedaqogika', sortOrder: 22 },
  { slug: 'jurnalistika', name: 'Jurnalistika', sortOrder: 23 },
  { slug: 'dizayn', name: 'Dizayn', sortOrder: 24 },
  { slug: 'turizm', name: 'Turizm və otelçilik', sortOrder: 25 },
  { slug: 'kimya', name: 'Kimya', sortOrder: 26 },
  { slug: 'biologiya', name: 'Biologiya', sortOrder: 27 },
  { slug: 'riyaziyyat', name: 'Riyaziyyat', sortOrder: 28 },
  { slug: 'fizika', name: 'Fizika', sortOrder: 29 },
  { slug: 'aqronomluq', name: 'Aqronomluq', sortOrder: 30 },

  { slug: 'diger-ixtisas', name: 'Digər / siyahıda yoxdur', isOther: true, sortOrder: 9999 },
];

// ---------------------------------------------------------------------------
// Monetizasiya məhsulları — HAMISI DEAKTİV
// ---------------------------------------------------------------------------

/**
 * Qiymətlər qəpiklə saxlanılır (3 AZN = 300).
 *
 * Bütün sətirlər `isActive: false` ilə yaradılır: ödəniş inteqrasiyası
 * qurulmayıb və heç bir məhsul satışa çıxmır. Sxem indidən hazırdır ki,
 * ödəniş qoşulanda cədvəl dəyişikliyi lazım olmasın.
 */
export interface ProductSeed {
  code: string;
  nameAz: string;
  descriptionAz: string;
  priceQepik: number;
  durationDays: number;
  audience: 'LISTING' | 'OWNER' | 'STUDENT';
  sortOrder: number;
}

export const monetizationProducts: ProductSeed[] = [
  {
    code: 'LISTING_BOOST',
    nameAz: 'Elanı önə çıxar',
    descriptionAz: 'Elan axtarış nəticələrində 7 gün ərzində yuxarıda göstərilir.',
    priceQepik: 300,
    durationDays: 7,
    audience: 'LISTING',
    sortOrder: 1,
  },
  {
    code: 'LISTING_PREMIUM',
    nameAz: 'Premium elan',
    descriptionAz: 'Nişan, daha çox şəkil və axtarışda daimi üstünlük.',
    priceQepik: 500,
    durationDays: 30,
    audience: 'LISTING',
    sortOrder: 2,
  },
  {
    code: 'LISTING_HOME_FEATURED',
    nameAz: 'Ana səhifədə elan',
    descriptionAz: 'Elan ana səhifədəki seçilmiş elanlar bölməsində göstərilir.',
    priceQepik: 1000,
    durationDays: 7,
    audience: 'LISTING',
    sortOrder: 3,
  },
  {
    code: 'AGENCY_PRO',
    nameAz: 'Agentlik üçün professional abunə',
    descriptionAz: 'Limitsiz elan, toplu idarəetmə və statistika. Aylıq.',
    priceQepik: 4900,
    durationDays: 30,
    audience: 'OWNER',
    sortOrder: 4,
  },
  {
    code: 'STUDENT_PREMIUM',
    nameAz: 'Tələbə premium',
    descriptionAz:
      'Daha çox uyğun profil, daha çox saxlanılan axtarış və prioritet bildiriş.',
    priceQepik: 200,
    durationDays: 30,
    audience: 'STUDENT',
    sortOrder: 5,
  },
];
