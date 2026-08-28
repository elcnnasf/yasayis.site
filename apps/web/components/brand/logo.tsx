import { cn } from '@/lib/cn';

/**
 * Yaşayış loqosu — xətti üslub: yuvarlaq çərçivə, ev və içindəki insan.
 *
 * SVG-dir, rastr deyil: hər ölçüdə iti qalır və rəngini `currentColor`-dan alır,
 * yəni tünd yaşıl fonda ağ, ağ fonda tünd yaşıl olur — ayrıca fayl lazım deyil.
 */
export function LogoMark({
  className,
  title = 'Yaşayış',
}: {
  className?: string;
  title?: string;
}) {
  return (
    <svg
      viewBox="0 0 64 64"
      role="img"
      aria-label={title}
      className={cn('size-8', className)}
      fill="none"
      stroke="currentColor"
      strokeWidth={2.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Çərçivə */}
      <rect x="3.6" y="3.6" width="56.8" height="56.8" rx="15" />

      {/* Ev: dam və baca */}
      <path d="M12.5 30.5 32 13.5 51.5 30.5" />
      <path d="M44.2 21.4V16.2h4.2v9.1" />

      {/* Divarlar və döşəmə */}
      <path d="M16.2 30.8v13.4a5.2 5.2 0 0 0 5.2 5.2h21.2a5.2 5.2 0 0 0 5.2-5.2V30.8" />

      {/* İnsan: saç, baş, üz */}
      <path d="M25.8 33.4c-.2-4.2 2.6-7.4 6.6-7.4 3.4 0 5.6 1.9 6.2 4.6.5 2 .1 2.8-.4 2.8" />
      <path d="M25.8 32.2c0 4 2.8 7.2 6.2 7.2s6.2-3.2 6.2-7.2" />
      <path d="M29.4 33.6a1.6 1.6 0 0 1 2.2 0M32.8 33.6a1.6 1.6 0 0 1 2.2 0" />
      <path d="M30.4 36.2a2.6 2.6 0 0 0 3.6 0" />

      {/* Boyun və çiyinlər */}
      <path d="M29.9 39v2.1M34.5 39v2.1" />
      <path d="M22.4 49.4c0-5.1 4.3-8.3 9.8-8.3s9.8 3.2 9.8 8.3" />
    </svg>
  );
}

/**
 * Yalnız söz nişanı — header və footer üçün.
 *
 * Nişansız, çünki hər ikisi TÜND səthdədir: orada xətti ikon ya itir, ya da
 * qalınlaşdırılmalı olur və o zaman loqo öz nisbətini itirir. Böyük hərflərlə
 * yazılmış ad tünd fonda daha aydın oxunur və brendi bir söz kimi yadda saxlayır.
 *
 * Rəngini `currentColor`-dan alır — valideyn səth hansı rəngdədirsə ona uyğunlaşır.
 */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'font-display text-xl font-bold uppercase tracking-[0.06em] text-current',
        className,
      )}
    >
      Yasayis
    </span>
  );
}

/**
 * Loqo + söz nişanı — AÇIQ səthlər üçün.
 *
 * Başlıq və altlıq tünd olduğu üçün orada `Wordmark` işlənir; bu variant
 * paylaşma kartları, e-poçt şablonu və açıq fonlu daxili səhifələr üçün
 * saxlanılır.
 */
export function Logo({
  className,
  markClassName,
}: {
  className?: string;
  markClassName?: string;
}) {
  return (
    <span className={cn('flex items-center gap-2.5', className)}>
      <LogoMark className={cn('size-9 text-forest-700', markClassName)} />
      <span className="font-display text-xl font-semibold tracking-tight text-forest-800">
        Yaşayış
      </span>
    </span>
  );
}
