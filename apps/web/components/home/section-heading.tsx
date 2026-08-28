import Link from 'next/link';
import { ArrowRight, type LucideIcon } from 'lucide-react';

/**
 * Ana səhifədəki bölmə başlığı.
 *
 * Bütün bölmələr eyni komponentdən keçir ki, başlıq ölçüsü, boşluq və
 * "hamısına bax" linkinin yeri hər bölmədə eyni olsun — hər bölməni ayrı
 * dizayn etmək səhifəni yamaq-yamaq göstərir.
 *
 * İkon məcburi deyil və emoji ilə əvəz edilmir: emoji hər cihazda başqa cür
 * render olunur və palitraya idarə edilməyən rəng gətirir. Xətt ikonu isə
 * başlığın rəngini alır və mətnlə eyni ailədən oxunur.
 */
export function SectionHeading({
  icon: Icon,
  title,
  note,
  moreHref,
  moreLabel = 'Hamısına bax',
}: {
  icon?: LucideIcon;
  title: string;
  note?: string;
  /** Verilsə, başlığın sağında (mobil-də altında) keçid göstərilir. */
  moreHref?: string;
  moreLabel?: string;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
      <div className="min-w-0">
        <h2 className="flex items-center gap-2 text-h2 text-stone-900">
          {Icon && (
            <Icon className="size-5 shrink-0 text-sprout-600" strokeWidth={2} aria-hidden />
          )}
          {title}
        </h2>
        {note && <p className="mt-1.5 max-w-2xl text-body text-stone-600">{note}</p>}
      </div>

      {moreHref && (
        <Link
          href={moreHref}
          className="flex shrink-0 items-center gap-1.5 text-sm font-semibold text-sprout-600 transition-colors hover:text-sprout-700"
        >
          {moreLabel}
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      )}
    </div>
  );
}
