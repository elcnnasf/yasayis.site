/**
 * Mühit dəyişənlərinin validasiyası.
 *
 * Tətbiq yanlış konfiqurasiya ilə START ETMİR — səhv .env dəyəri sonradan
 * gizli xəta kimi çıxmasın deyə burada, açılışda tutulur.
 */

import { z } from 'zod';

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
  MONETIZATION_ENABLED: z.coerce.boolean().default(false),

  SMS_PROVIDER: z.enum(['console', 'http']).default('console'),
  SMS_API_URL: optionalUrl(),
  SMS_API_KEY: optionalText(),
  SMS_SENDER: z.string().default('Yasayis'),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(raw: Record<string, unknown>): Env {
  const parsed = envSchema.safeParse(raw);

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
    // Konsola yazan SMS provayderi ilə real OTP göndərilmir — istifadəçi girə bilməz.
    if (env.SMS_PROVIDER === 'console') {
      throw new Error('Production-da SMS_PROVIDER "console" ola bilməz.');
    }
  }

  if (env.SMS_PROVIDER === 'http' && (!env.SMS_API_URL || !env.SMS_API_KEY)) {
    throw new Error('SMS_PROVIDER="http" seçiləndə SMS_API_URL və SMS_API_KEY məcburidir.');
  }

  return env;
}
