/**
 * API-nin şəkil verdiyi hostu `NEXT_PUBLIC_API_URL`-dən çıxarır.
 * Ünvan oxunmasa boş massiv qaytarır — konfiqurasiya səhvi build-i uçurmasın.
 */
function apiImagePattern() {
  try {
    const { protocol, hostname, port } = new URL(
      process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1',
    );
    return [
      {
        protocol: protocol.replace(':', ''),
        hostname,
        ...(port ? { port } : {}),
        pathname: '/uploads/**',
      },
    ];
  } catch {
    return [];
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  /*
    Build qovluğu mühit dəyişəni ilə dəyişdirilə bilir.

    Səbəb: `next build` işləyən `next dev` ilə eyni `.next` qovluğunu paylaşır
    və biri digərinin fayllarını üstələyir — dev server build zamanı uçur.
    CI-da və lokal yoxlamada ayrı qovluğa build etmək bunun qarşısını alır.
  */
  distDir: process.env.NEXT_DIST_DIR ?? '.next',

  /*
    Lint build-in İÇİNDƏ işlədilmir — ayrıca `npm run lint` əmri ilə,
    bütün repo üçün bir dəfə işləyir (bax: kökdəki `eslint.config.mjs`).

    Səbəb: Next build zamanı yalnız `apps/web` qovluğunu yoxlayır və özünün
    `eslint-config-next` plaginini gözləyir. Həmin plagin ESLint 9 flat
    konfiqurasiyası ilə uyğunsuzdur, ona görə işlədilmir — nəticədə build hər
    dəfə "plagin tapılmadı" xəbərdarlığı verirdi.

    Bu, yoxlamanı ZƏİFLƏTMİR: `npm run lint` API, web və paketləri birlikdə,
    `--max-warnings 0` ilə yoxlayır və CI-da build-dən əvvəl çağırılmalıdır.
  */
  eslint: { ignoreDuringBuilds: true },

  // Ortaq paket monorepo daxilində qurulur.
  transpilePackages: ['@yasayis/shared'],

  images: {
    /*
      Elan şəkilləri iki yerdən gələ bilər və HƏR İKİSİ icazəli olmalıdır:

        · prod  → Supabase Storage (`STORAGE_DRIVER=supabase`)
        · dev   → API-nin öz `/uploads` qovluğu (`STORAGE_DRIVER=local`)

      Yalnız Supabase yazılsaydı — və uzun müddət belə idi — lokal mühitdə
      yüklənən hər şəkil `next/image`-də "hostname is not configured" xətası
      verir və elan yerləşdirmə axını sonuncu addımda sınırdı.

      API ünvanı mühit dəyişənindən oxunur ki, port dəyişəndə burada da
      dəyişməsin.
    */
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co', pathname: '/storage/**' },
      ...apiImagePattern(),
    ],
    formats: ['image/webp'],
  },

  async headers() {
    const isProd = process.env.NODE_ENV === 'production';

    const headers = [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      // `frame-ancestors` bunu əvəz edir, amma köhnə brauzerlər onu bilmir.
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Content-Security-Policy', value: contentSecurityPolicy(isProd) },
      /*
        Brauzer imkanları standart olaraq BAĞLANIR.

        Sayt nə kameraya, nə mikrofona, nə də məkana müraciət etmir. Boş
        siyahı ("()") həmin imkanı bütün mənbələr üçün söndürür — belə ki,
        gələcəkdə əlavə olunan üçüncü tərəf skripti də onları aça bilməsin.
      */
      {
        key: 'Permissions-Policy',
        value: [
          'camera=()',
          'microphone=()',
          'geolocation=()',
          'payment=()',
          'usb=()',
          'interest-cohort=()',
        ].join(', '),
      },
    ];

    if (isProd) {
      // Yalnız HTTPS-də mənalıdır; dev-də qoyulsa lokal `http` bloklanır.
      headers.push({
        key: 'Strict-Transport-Security',
        value: 'max-age=63072000; includeSubDomains; preload',
      });
    }

    return [{ source: '/:path*', headers }];
  },
};

/**
 * Content-Security-Policy.
 *
 * `script-src`-də `'unsafe-inline'` var və bu, QƏSDƏN belədir. Next hidrasiya
 * üçün sətir daxili skript yerləşdirir; onu aradan qaldırmağın yeganə yolu
 * nonce-lardır, nonce isə hər sorğuda dəyişdiyi üçün bütün səhifələri dinamik
 * edir — SEO şəhər səhifələrimiz statik yaradılır və bu, onları söndürərdi.
 *
 * Ona görə müdafiə başqa yerdən gəlir: `object-src 'none'` (plagin yoxdur),
 * `base-uri 'self'` (link bazasını dəyişib skript ünvanını oğurlamaq olmaz),
 * `form-action 'self'` (forma kənara göndərilə bilməz), `frame-ancestors 'none'`
 * (clickjacking) və `connect-src`-in yalnız öz API-mizlə məhdudlaşdırılması
 * (məlumat kənar serverə sızdırıla bilməz).
 */
function contentSecurityPolicy(isProd) {
  const api = apiOrigin();

  const directives = {
    'default-src': ["'self'"],
    // `'unsafe-eval'` yalnız dev-də: Next-in sürətli yenilənməsi ondan asılıdır.
    'script-src': ["'self'", "'unsafe-inline'", ...(isProd ? [] : ["'unsafe-eval'"])],
    // Tailwind və Next sətir daxili üslub yerləşdirir. Şriftlər `next/font`
    // ilə öz domenimizdən verilir — xarici şrift mənbəyi lazım deyil.
    'style-src': ["'self'", "'unsafe-inline'"],
    'font-src': ["'self'", 'data:'],
    /*
      `blob:` şəkil yükləyicisinin önbaxışı üçündür (`URL.createObjectURL`),
      `data:` isə kiçik daxili qrafikalar üçün.
    */
    /*
      `*.tile.openstreetmap.org` — elan detalındakı xəritənin kafelləri.
      Leaflet kafelləri adi `<img>` kimi yükləyir, ona görə `img-src`-ə düşür.
      Başqa xarici mənbə açılmır: xəritə açar tələb etmir və `connect-src`
      toxunulmamış qalır (kafellər `fetch` ilə deyil, şəkil kimi gəlir).
    */
    'img-src': [
      "'self'",
      'data:',
      'blob:',
      'https://*.supabase.co',
      'https://*.tile.openstreetmap.org',
      api,
    ].filter(Boolean),
    'connect-src': ["'self'", api].filter(Boolean),
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"],
    'frame-src': ["'none'"],
    'worker-src': ["'self'", 'blob:'],
    'manifest-src': ["'self'"],
  };

  const policy = Object.entries(directives)
    .map(([key, values]) => `${key} ${values.join(' ')}`)
    .join('; ');

  return isProd ? `${policy}; upgrade-insecure-requests` : policy;
}

/** API-nin origin-i (`https://api.yasayis.az` kimi) — CSP siyahıları üçün. */
function apiOrigin() {
  try {
    return new URL(process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1').origin;
  } catch {
    return null;
  }
}

export default nextConfig;
