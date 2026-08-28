import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

/**
 * Səthlər.
 *
 * Sərhəd qəsdən yumşaqdır: 1px tünd xətt əvəzinə çox açıq halqa (`ring`) və
 * yaşıla çalan yumşaq kölgə. Sərt sərhəd səhifəni "cədvəl" kimi göstərir və
 * kartlar bir-birindən qopur; halqa + kölgə isə onları eyni səthin üzərində
 * qaldırılmış kimi oxudur.
 *
 *   Card  → siyahı elementi, elan kartı
 *   Panel → səhifə bölməsi, form qutusu (daha yumşaq künc)
 */

const base =
  'bg-white ring-1 ring-stone-200/70 shadow-[var(--shadow-card)] transition-shadow duration-200';

export function Card({
  className,
  interactive,
  ...props
}: HTMLAttributes<HTMLDivElement> & { interactive?: boolean }) {
  return (
    <div
      className={cn(
        base,
        'rounded-[var(--radius-card)]',
        // Yalnız bütövlükdə klikləna bilən kartda — kölgənin dəyişməsi
        // "bura vurula bilər" siqnalıdır, dekorasiya deyil.
        interactive &&
          'hover:-translate-y-0.5 hover:shadow-[var(--shadow-card-hover)] hover:ring-stone-300/70 motion-reduce:hover:translate-y-0',
        className,
      )}
      {...props}
    />
  );
}

export function Panel({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn(base, 'rounded-[var(--radius-panel)]', className)} {...props} />
  );
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('border-b border-stone-200/80 px-5 py-4', className)}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn('text-h3 text-stone-900', className)} {...props} />;
}

export function CardBody({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-5', className)} {...props} />;
}

export function CardFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('border-t border-stone-200/80 px-5 py-4', className)}
      {...props}
    />
  );
}

/**
 * Kartın içində vurğulanan blok.
 * Boz deyil, yaşıla çalan açıq ton — səhifənin qalanı ilə eyni ailədən.
 */
export function Well({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-[var(--radius-input)] bg-forest-50/70 px-4 py-3.5 ring-1 ring-forest-100/80',
        className,
      )}
      {...props}
    />
  );
}

/** Yüklənmə vaxtı məzmunun yerini tutan boş forma. */
export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden
      className={cn('animate-pulse rounded-[var(--radius-input)] bg-stone-200/70', className)}
      {...props}
    />
  );
}

/** Elan kartının yüklənmə vəziyyəti — siyahının sıçramasının qarşısını alır. */
export function ListingCardSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn('overflow-hidden', className)}>
      <Skeleton className="aspect-[4/3] rounded-none" />
      <div className="flex flex-col gap-2.5 p-4">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-3.5 w-2/3" />
        <Skeleton className="mt-2 h-9 w-full" />
      </div>
    </Card>
  );
}
