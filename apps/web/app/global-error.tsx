'use client';

/**
 * Kök layout-un özü uçanda işə düşən son sipər.
 *
 * `error.tsx`-dən fərqi: o, layout-un İÇİNDƏ render olunur və başlıq/altlıq
 * yerində qalır. Layout özü xəta verəndə isə render edəcək heç nə qalmır —
 * ona görə bu fayl `<html>` və `<body>` teqlərini ÖZÜ yazmalıdır.
 *
 * Buna görə də burada nə şrift dəyişəni, nə Tailwind sinifləri işləyir:
 * `globals.css` layout ilə birlikdə düşüb. Üslub sətir daxilində verilir —
 * bu, yeganə düzgün həlldir, səliqəsizlik deyil.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="az">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem',
          background: '#fafbfa',
          color: '#141816',
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
        }}
      >
        <main style={{ maxWidth: '28rem', textAlign: 'center' }}>
          <p
            style={{
              margin: 0,
              fontSize: '0.6875rem',
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: '#268a5d',
            }}
          >
            Yasayis
          </p>

          <h1
            style={{
              margin: '0.75rem 0 0',
              fontSize: '1.5rem',
              lineHeight: 1.2,
              fontWeight: 600,
            }}
          >
            Sayt açıla bilmədi.
          </h1>

          <p style={{ margin: '0.75rem 0 0', lineHeight: 1.6, color: '#576059' }}>
            Gözlənilməz xəta baş verdi. Səhifəni yeniləyin — problem davam edərsə bir
            azdan yenidən cəhd edin.
          </p>

          {error.digest && (
            <p style={{ margin: '1rem 0 0', fontSize: '0.75rem', color: '#78827c' }}>
              Xəta kodu: {error.digest}
            </p>
          )}

          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: '1.5rem',
              padding: '0.75rem 1.75rem',
              border: 0,
              borderRadius: '0.625rem',
              background: '#268a5d',
              color: '#ffffff',
              fontSize: '0.9375rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Yenidən cəhd et
          </button>
        </main>
      </body>
    </html>
  );
}
