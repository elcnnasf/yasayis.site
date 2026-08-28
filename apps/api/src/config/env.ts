/**
 * Mühit dəyişənlərinin validasiyası.
 *
 * Tətbiq yanlış konfiqurasiya ilə START ETMİR — səhv .env dəyəri sonradan
 * gizli xəta kimi çıxmasın deyə burada, açılışda tutulur.
 */

import { z } from 'zod';
import { booleanFlag } from '@yasayis/shared';

/**
 * `.env` faylında doldurulmamış sahə boş sətir kimi gəlir (`KEY=""`), bu isə
 * `optional()` üçün "verilib" deməkdir və `.url()` yoxlaması sınır.
 * Boş sətri `undefined`-a çeviririk ki, "doldurulmayıb" düzgün başa düşülsün.
 */
const blankToUndefined = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((v) => (typeof v === 'string' && v.trim() === '' ? undefined : v), schema);

const optionalUrl = () => blankToUndefined(z.string().url().optional());
const optionalText = () => blankToUndefined(z.string().optional());

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  DATABASE_URL: z.string().url('DATABASE_URL düzgün deyil'),
  DIRECT_URL: optionalUrl(),

  /*
    Portu HOST təyin edir.

    Render, Railway, Fly və əksər hostlar dinlənəcək portu `PORT` mühit
    dəyişəni ilə verir və trafiki ora yönləndirir. Tətbiq sabit 4000-i
    dinləsəydi, host heç bir cavab almayıb onu "sağlam deyil" sayardı və
    dayandırardı — deploy səssizcə uğursuz olardı.

    Ona görə sıra belədir: `API_PORT` (açıq təyin edilibsə) → `PORT` (host
    verirsə) → 4000 (lokal iş).
  */
  API_PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  API_PREFIX: z.string().startsWith('/').default('/api/v1'),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),

  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET ən azı 32 simvol olmalıdır'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET ən azı 32 simvol olmalıdır'),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL: z.string().default('30d'),

  /**
   * Sessiya cookie-sinin `SameSite` dəyəri.
   *
   * `lax` (standart) YALNIZ web və API eyni saytda olanda işləyir — eyni
   * domen və ya eyni əsas domenin altdomenləri (`yasayis.site` və
   * `api.yasayis.site`). Bu halda ən təhlükəsiz seçimdir.
   *
   * API başqa domendədirsə (məsələn hostinq platformasının öz domeni),
   * `lax` cross-site XHR-də cookie-ni ÜMUMİYYƏTLƏ göndərmir və giriş səssizcə
   * işləməz olur — istifadəçi daxil olur, amma hər sorğu 401 qaytarır.
   * Belə quraşdırmada `none` lazımdır və o, məcburi `secure` tələb edir.
   */
  COOKIE_SAMESITE: z.enum(['lax', 'strict', 'none']).default('lax'),

  GOOGLE_CLIENT_ID: optionalText(),
  GOOGLE_CLIENT_SECRET: optionalText(),
  GOOGLE_REDIRECT_URI: optionalUrl(),

  // Fayl saxlama: dev-də lokal disk kifayətdir, prod-da Supabase Storage.
  STORAGE_DRIVER: z.enum(['local', 'supabase']).default('local'),
  /** Lokal sürücüdə şəkil ünvanlarının önü. */
  PUBLIC_URL: z.string().url().default('http://localhost:4000'),

  SUPABASE_URL: optionalUrl(),
  SUPABASE_SERVICE_ROLE_KEY: optionalText(),
  SUPABASE_STORAGE_BUCKET: z.string().default('listings'),

  // E-poçt kanalı: dev-də log-a yazır. Push kanalı gələcək fazadadır.
  EMAIL_PROVIDER: z.enum(['console', 'http']).default('console'),
  EMAIL_FROM: z.string().default('Yaşayış <noreply@yasayis.site>'),

  // Monetizasiya: ödəniş inteqrasiyası yoxdur, bayraq həmişə false olmalıdır.
  /*
    `booleanFlag` işlədilir, `z.coerce.boolean()` yox: sonuncu `"false"` sətrini
    `true` sayır (boş olmayan sətir JS-də truthy-dir). Nəticədə `.env`-də
    `MONETIZATION_ENABLED="false"` yazılsa da dəyər `true` olurdu və tətbiq
    prod-da "monetizasiya dəstəklənmir" xətası ilə START ETMİRDİ.
  */
  MONETIZATION_ENABLED: booleanFlag.default(false),

  /*
    SMS provayderi — telefon funksiyalarının açarı.

      console  — kod yalnız log-a yazılır. YALNIZ DEV; prod-da qadağandır.
      http     — real provayder (`SMS_API_URL` + `SMS_API_KEY` tələb olunur).
      disabled — telefonla bağlı funksiyalar TAM SÖNÜLÜDÜR.

    `disabled` şüurlu seçimdir, nasazlıq deyil: provayder hesabı olmayan
    layihənin qalan hər şeylə (e-poçtla giriş, elan, axtarış, mesajlaşma)
    canlıya çıxmasına imkan verir. Bu rejimdə telefonla bağlı bütün UI gizlənir
    və OTP endpoint-ləri aydın xəta qaytarır — yarımçıq işləyən düymə qalmır.
  */
  SMS_PROVIDER: z.enum(['console', 'http', 'disabled']).default('console'),
  SMS_API_URL: optionalUrl(),
  SMS_API_KEY: optionalText(),
  SMS_SENDER: z.string().default('Yasayis'),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(raw: Record<string, unknown>): Env {
  /*
    Host `PORT` verirsə, o üstün tutulur — bax: `API_PORT` şərhinə.

    BOŞ SƏTİR də "verilməyib" sayılır. Host panellərində sahəni yaratmaq, amma
    dəyəri boş qoymaq adi haldır; `z.coerce.number()` isə boş sətri 0-a çevirir
    və tətbiq "port 1-dən böyük olmalıdır" kimi çaşdırıcı mesajla çökür.
  */
  const blank = (v: unknown) => v === undefined || v === null || v === '';
  const withHostPort = blank(raw.API_PORT) ? { ...raw, API_PORT: raw.PORT } : raw;
  if (blank(withHostPort.API_PORT)) delete withHostPort.API_PORT;

  const parsed = envSchema.safeParse(withHostPort);

  if (!parsed.success) {
    const lines = parsed.error.issues.map((i) => `  · ${i.path.join('.')}: ${i.message}`);
    throw new Error(`Mühit dəyişənləri yanlışdır:\n${lines.join('\n')}`);
  }

  const env = parsed.data;

  if (env.NODE_ENV === 'production') {
    // `SameSite=None` brauzerlərdə yalnız `Secure` cookie ilə qəbul olunur.
    // Dev-də `secure` sönülüdür, ona görə bu yoxlama yalnız prod-dadır.
    if (env.COOKIE_SAMESITE === 'none' && !env.PUBLIC_URL.startsWith('https://')) {
      throw new Error(
        'COOKIE_SAMESITE="none" HTTPS tələb edir — PUBLIC_URL "https://" ilə başlamalıdır.',
      );
    }
    // Lokal disk prod-da işləmir (deploy zamanı itir) — Supabase məcburidir.
    if (env.STORAGE_DRIVER !== 'supabase') {
      throw new Error('Production-da STORAGE_DRIVER "supabase" olmalıdır.');
    }
    if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error(
        'Production-da SUPABASE_URL və SUPABASE_SERVICE_ROLE_KEY məcburidir (elan şəkilləri üçün).',
      );
    }
    // Ödəniş inteqrasiyası qurulmayıb — bayraq açıq qalarsa istifadəçi pul
    // ödəmədən premium funksiya alar.
    if (env.MONETIZATION_ENABLED) {
      throw new Error(
        'MONETIZATION_ENABLED hazırda dəstəklənmir — ödəniş inteqrasiyası qurulmayıb.',
      );
    }
    /*
      Konsola yazan provayder prod-da qadağandır: kod yalnız server log-una
      düşür, istifadəçi onu heç cür ala bilmir — yəni düymə var, nəticə yoxdur.

      `disabled` isə İCAZƏLİDİR. Fərq niyyətdədir: `console` "real SMS olacaq,
      amma hələ qurulmayıb" deməkdir və səssizcə sınır; `disabled` isə
      "telefon funksiyaları yoxdur" deməkdir və UI buna uyğun gizlənir.
    */
    if (env.SMS_PROVIDER === 'console') {
      throw new Error(
        'Production-da SMS_PROVIDER "console" ola bilməz. Real provayder üçün "http", ' +
          'telefon funksiyalarını tamamilə söndürmək üçün "disabled" seçin.',
      );
    }
  }

  if (env.SMS_PROVIDER === 'http' && (!env.SMS_API_URL || !env.SMS_API_KEY)) {
    throw new Error('SMS_PROVIDER="http" seçiləndə SMS_API_URL və SMS_API_KEY məcburidir.');
  }

  return env;
}
