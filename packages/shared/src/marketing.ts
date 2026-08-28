/**
 * Marketinq mesajlaşması — VAHİD MƏNBƏ.
 *
 * Hero, meta description, sosial media bio və paylaşma kartları buradan oxuyur.
 * Mətn iki yerdə yazılanda vaxtla ayrılır və brend səsi dağılır.
 *
 * ƏSAS QAYDA — "çoxlu ev var" DEYİL, "sənə uyğun ev və sənə uyğun insan var".
 * Kəmiyyət vədini rəqiblər onsuz da verir və biz onu qazana bilmərik:
 * ilk gün elan sayımız az olacaq. Uyğunluq isə ilk gündən doğrudur.
 *
 * Üç sütun bütün səthlərdə eyni sıra ilə təkrarlanır:
 *   1. Uyğunluq — şəffaf faiz və izah
 *   2. Etibar   — telefon təsdiqi, şikayət, "şəxsən yoxla" xəbərdarlığı
 *   3. Sadəlik  — 3 addım, uzun forma yox
 */

export const BRAND = {
  name: 'Yaşayış',
  domain: 'yasayis.site',
  /** Qısa şüar — loqonun yanında və footer-də. */
  tagline: 'Tələbələr üçün daha uyğun yaşayış',
} as const;

/**
 * Real əlaqə kanalları — VAHİD MƏNBƏ.
 *
 * Buraya YALNIZ doğrudan mövcud olan kanal yazılır. Əvvəl footer və əlaqə
 * səhifəsi uydurma dəyərlər göstərirdi (köhnə `yasayis.az` e-poçtu, saxta
 * telefon nömrəsi, mövcud olmayan Telegram kanalı) — istifadəçi onlara
 * yazanda cavab ala bilmirdi. İşləməyən əlaqə kanalı heç bir kanaldan pisdir,
 * çünki istifadəçi cavab gözləyir.
 *
 * TELEFON NÖMRƏSİ QƏSDƏN YOXDUR və əlavə edilməməlidir.
 * Telegram da yoxdur — kanal açılana qədər ikonu qaytarmayın.
 *
 * Ad `CONTACT` deyil: `constants.ts`-də mesaj uzunluqları üçün `CONTACT`,
 * `schemas/analytics.ts`-də isə əlaqə kanalı enum-u üçün `CONTACT_CHANNELS`
 * artıq işlənir və `index.ts` hamısını bir yerdən ixrac edir.
 */
export const CONTACT_INFO = {
  email: 'yasayis.site@gmail.com',
  instagram: { handle: '@yasayis.site', url: 'https://instagram.com/yasayis.site' },
  tiktok: { handle: '@yasayis.site', url: 'https://tiktok.com/@yasayis.site' },
} as const;

// ---------------------------------------------------------------------------
// Hero
// ---------------------------------------------------------------------------

export const HERO = {
  headline: 'Tələbələr üçün daha uyğun yaşayış.',
  subheadline:
    'Ev, otaq və otaq yoldaşını universitetinə, büdcənə və yaşayış tərzinə uyğun tap.',
  primaryCta: 'Ev / otaq tap',
  secondaryCta: 'Otaq yoldaşı tap',
  /**
   * "Elan yerləşdir" hero-da GÖSTƏRİLMİR — yalnız naviqasiyada.
   * Ana səhifəyə gələnlərin böyük əksəriyyəti yaşayış axtaran tələbədir;
   * ev sahibini eyni ekranda üçüncü CTA ilə çağırmaq əsas axını zəiflədir.
   */
  tertiaryCta: 'Elan yerləşdir',
} as const;

/**
 * Alternativ başlıqlar — A/B testi və kampaniyalar üçün.
 * Hamısı eyni fokusdadır: uyğunluq, kəmiyyət deyil.
 */
export const HEADLINE_VARIANTS: { headline: string; subheadline: string; note: string }[] = [
  {
    headline: 'Sənə uyğun yaşayışı tap.',
    subheadline:
      'Ev, otaq və otaq yoldaşını tələbələr üçün hazırlanmış platformada tap.',
    note: 'Əsas variant — neytral və geniş.',
  },
  {
    headline: 'Təsadüfi otaq yoldaşı yox — sənə uyğun olanı.',
    subheadline:
      'Vərdişlərini, büdcəni və universitetini müqayisə edirik. Faizi görürsən, səbəbini də.',
    note: 'Otaq yoldaşı kampaniyası — ən güclü fərqləndiricini önə çıxarır.',
  },
  {
    headline: 'Universitetinə yaxın, büdcənə uyğun.',
    subheadline:
      'Elanları məsafəyə və qiymətə görə süzürsən, qalanını uyğunluq skoru edir.',
    note: 'Semestr başlanğıcı — ev axtaran tələbə üçün.',
  },
  {
    headline: 'Burada sənə uyğun ev və sənə uyğun insan var.',
    subheadline:
      'Tələbələr üçün qurulmuş platforma: telefon təsdiqi, şəffaf uyğunluq, üç addımlıq qeydiyyat.',
    note: 'Üç sütunun hamısını bir cümlədə deyir — sosial media üçün.',
  },
];

// ---------------------------------------------------------------------------
// Üç sütun
// ---------------------------------------------------------------------------

export interface Pillar {
  key: 'university' | 'budget' | 'roommate';
  title: string;
  description: string;
  /** Vədin arxasındakı konkret mexanizm — boş söz olmasın deyə. */
  proof: string;
}

export const PILLARS: readonly Pillar[] = [
  {
    key: 'university',
    title: 'Universitetinə yaxın',
    description:
      'Oxuduğun universitetə və seçdiyin əraziyə uyğun yaşayış tap.',
    proof: 'Hər elanda ən yaxın universitetə neçə dəqiqə olduğu yazılır.',
  },
  {
    key: 'budget',
    title: 'Büdcənə uyğun',
    description:
      'Qiymət aralığını seç və yalnız sənə uyğun variantlara bax.',
    proof: 'Kommunal xərcin daxil olub-olmadığı və depozit qiymətin yanındadır.',
  },
  {
    key: 'roommate',
    title: 'Uyğun otaq yoldaşı',
    description:
      'Eyni evdə yaşayacağın insanı əvvəlcədən tanı və uyğunluğunu gör.',
    proof: 'Faizin nədən yarandığını da göstəririk — büdcə, universitet, həyat tərzi.',
  },
];

// ---------------------------------------------------------------------------
// Necə işləyir
// ---------------------------------------------------------------------------

export const HOW_IT_WORKS: readonly { step: number; title: string; description: string }[] = [
  {
    step: 1,
    title: 'Axtar',
    description: 'Şəhərini, universitetini və büdcəni seç.',
  },
  {
    step: 2,
    title: 'Uyğun variantı seç',
    description: 'Ev, otaq və ya otaq yoldaşını müqayisə et.',
  },
  {
    step: 3,
    title: 'Əlaqə saxla',
    description: 'Uyğun variantla birbaşa əlaqə qur — vasitəçi və komissiya yoxdur.',
  },
];

/** Ana səhifənin sonundakı yekun çağırış. */
export const FINAL_CTA = {
  headline: 'Yeni yaşayışını tapmağa hazırsan?',
  subheadline: 'Büdcənə və həyat tərzinə uyğun ev və otaq yoldaşlarını kəşf et.',
  primaryCta: 'İndi axtarmağa başla',
  secondaryCta: 'Otaq yoldaşı tap',
} as const;

// ---------------------------------------------------------------------------
// Meta və sosial
// ---------------------------------------------------------------------------

export const META = {
  title: 'Yaşayış — sənə uyğun yaşayışı tap',
  /**
   * 155 simvola qədər. Kəmiyyət vədi yoxdur: "minlərlə elan" yazmaq həm
   * yanlışdır, həm də bizim üstünlüyümüz deyil.
   */
  description:
    'Tələbələr üçün ev, otaq və otaq yoldaşı. Uyğunluq faizini və səbəbini görürsən, profillər telefonla təsdiqlənir. Üç addımda başla.',
  ogTitle: 'Burada sənə uyğun ev və sənə uyğun insan var',
  ogDescription:
    'Yaşayış — Azərbaycan tələbələri üçün yaşayış platforması. Şəffaf uyğunluq, təsdiqlənmiş profillər, üç addımlıq qeydiyyat.',
} as const;

/** Sosial media bio-ları — simvol limitlərinə uyğun. */
export const SOCIAL_BIO = {
  /** Instagram: 150 simvol */
  instagram:
    'Tələbələr üçün ev, otaq və otaq yoldaşı 🎓\nUyğunluq faizi ilə — təsadüfən yox.\nyasayis.site',
  /** X / Twitter: 160 simvol */
  twitter:
    'Azərbaycan tələbələri üçün yaşayış platforması. Sənə uyğun ev və sənə uyğun insan. yasayis.site',
  /** LinkedIn: daha rəsmi */
  linkedin:
    'Yaşayış — Azərbaycan tələbələri üçün yaşayış marketplace-i. Ev, otaq və otaq yoldaşı axtarışını şəffaf uyğunluq skoru və təsdiqlənmiş profillər üzərində qururuq.',
  /** TikTok: 80 simvol */
  tiktok: 'Tələbə evi + uyğun otaq yoldaşı 🎓 yasayis.site',
} as const;
