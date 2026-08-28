import Link from 'next/link';
import { forwardRef, type AnchorHTMLAttributes, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

/**
 * Düymə — üç səviyyəli iyerarxiya.
 *
 *   primary   → səhifədə bir dənə: əsas hərəkət
 *   secondary → dəstəkləyici hərəkət
 *   tertiary  → az əhəmiyyətli, yüngül çərçivəli
 *
 * `danger` yalnız geri qaytarıla bilməyən əməliyyatlar üçündür.
 *
 * Toxunma hədəfi mobil-first-dir: ən kiçik ölçü 36px, standart 44px.
 * Primary düymədə yüngül kölgə var — səthdən qalxsın və basılası görünsün.
 */

type Variant = 'primary' | 'secondary' | 'tertiary' | 'danger';
type Size = 'sm' | 'md' | 'lg';

/**
 * Əsas yaşıl `sprout-600`-dır, `forest-700` deyil.
 *
 * Səbəb: `forest-700` (#0e4a31) ekranda demək olar ki, qara oxunur. Ağ mətnlə
 * kontrast yüksəkdir, amma düymə "basılası" görünmür — tünd ləkə kimi oturur
 * və hero-dakı, başlıqdakı, axtarış zolağındakı canlı yaşıl CTA-larla eyni
 * ailədən olmadığı dərhal hiss olunur. Bir səhifədə iki fərqli "əsas yaşıl"
 * olması dizayn sistemini pozur.
 *
 * `sprout-600` (#268a5d) ağ mətnlə AA kontrastını keçir və saytın qalanı ilə
 * eyni rəngdir.
 */
const variants: Record<Variant, string> = {
  primary:
    'bg-sprout-600 text-white shadow-[var(--shadow-xs)] hover:bg-sprout-500 active:bg-sprout-700 ' +
    'disabled:bg-stone-200 disabled:text-stone-400 disabled:shadow-none',
  secondary:
    'bg-sprout-50 text-sprout-700 ring-1 ring-sprout-200 hover:bg-sprout-100 hover:ring-sprout-300 ' +
    'active:bg-sprout-200 disabled:bg-stone-100 disabled:text-stone-400 disabled:ring-stone-200',
  tertiary:
    'bg-white text-stone-700 ring-1 ring-stone-200 hover:ring-stone-300 hover:text-sprout-700 ' +
    'active:bg-stone-50 disabled:text-stone-400 disabled:ring-stone-200',
  danger:
    'bg-danger-500 text-white hover:bg-danger-600 disabled:bg-stone-200 disabled:text-stone-400',
};

const sizes: Record<Size, string> = {
  sm: 'h-9 px-3.5 text-sm gap-1.5',
  md: 'h-11 px-5 text-body gap-2',
  lg: 'h-13 px-7 text-lead gap-2.5',
};

const base =
  'inline-flex items-center justify-center rounded-[var(--radius-input)] font-semibold ' +
  'whitespace-nowrap select-none transition-[background-color,box-shadow,color] duration-150 ' +
  'disabled:cursor-not-allowed';

interface CommonProps {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, CommonProps {
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    fullWidth,
    loading,
    className,
    children,
    disabled,
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(base, variants[variant], sizes[size], fullWidth && 'w-full', className)}
      {...props}
    >
      {loading && (
        <span
          aria-hidden
          className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      )}
      {children}
    </button>
  );
});

export interface ButtonLinkProps
  extends AnchorHTMLAttributes<HTMLAnchorElement>,
    CommonProps {
  href: string;
}

/** Naviqasiya edən "düymə" — semantik olaraq link qalır. */
export function ButtonLink({
  href,
  variant = 'primary',
  size = 'md',
  fullWidth,
  className,
  children,
  ...props
}: ButtonLinkProps) {
  return (
    <Link
      href={href}
      className={cn(base, variants[variant], sizes[size], fullWidth && 'w-full', className)}
      {...props}
    >
      {children}
    </Link>
  );
}

/**
 * Yalnız ikondan ibarət düymə.
 * `label` məcburidir — ekran oxuyucusu üçün ad olmadan ikon mənasızdır.
 */
export function IconButton({
  label,
  variant = 'tertiary',
  className,
  children,
  ...props
}: Omit<ButtonProps, 'size' | 'fullWidth'> & { label: string }) {
  return (
    <button
      aria-label={label}
      title={label}
      className={cn(
        base,
        variants[variant],
        'size-11 shrink-0 p-0',
        variant === 'tertiary' && 'bg-transparent ring-0 hover:bg-stone-100',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
