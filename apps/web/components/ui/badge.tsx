import { BadgeCheck, Check, Clock, ShieldCheck, X, type LucideIcon } from 'lucide-react';
import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

/**
 * Nişanlar.
 *
 * İki cür işlənir:
 *   · `Badge` — ümumi etiket (elan statusu, sayğac, kateqoriya)
 *   · `VerifiedBadge` — etibar nişanı ("✓ Tələbə təsdiqlənib")
 *
 * Etibar nişanları platformanın ən vacib siqnalıdır, ona görə onların rəngi
 * brendin əsas yaşılıdır — dekorativ deyil, məna daşıyır.
 */

type Tone = 'neutral' | 'brand' | 'accent' | 'warning' | 'danger' | 'outline';

/**
 * Tonlar yumşaq fon + tünd mətn prinsipi ilədir: doymuş fon üzərində ağ mətn
 * yalnız `brand` tonunda işlədilir, çünki kartda bir neçə doymuş nişan
 * yan-yana düşəndə səhifə "rəngli etiket yığını"na çevrilir.
 */
const tones: Record<Tone, string> = {
  neutral: 'bg-stone-100 text-stone-700 ring-1 ring-stone-200/60',
  brand: 'bg-sprout-600 text-white',
  accent: 'bg-sprout-100 text-forest-700 ring-1 ring-sprout-200/70',
  warning: 'bg-warning-50 text-warning-600 ring-1 ring-warning-100',
  danger: 'bg-danger-50 text-danger-600 ring-1 ring-danger-100',
  outline: 'bg-white text-stone-700 ring-1 ring-stone-300',
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
  icon?: LucideIcon;
  size?: 'sm' | 'md';
}

export function Badge({
  tone = 'neutral',
  icon: Icon,
  size = 'md',
  className,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-[var(--radius-chip)] font-semibold',
        size === 'sm' ? 'px-2 py-0.5 text-2xs' : 'px-2.5 py-1 text-2xs',
        'leading-none',
        tones[tone],
        className,
      )}
      {...props}
    >
      {Icon && <Icon className="size-3 shrink-0" aria-hidden />}
      {children}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Etibar nişanları
// ---------------------------------------------------------------------------

export type VerificationKind = 'student' | 'phone' | 'owner';

const verifications: Record<
  VerificationKind,
  { label: string; pendingLabel: string; icon: LucideIcon }
> = {
  student: {
    label: 'Tələbə təsdiqlənib',
    pendingLabel: 'Tələbə statusu yoxlanılır',
    icon: BadgeCheck,
  },
  phone: {
    label: 'Telefon təsdiqlənib',
    pendingLabel: 'Telefon təsdiqlənməyib',
    icon: Check,
  },
  owner: {
    label: 'Ev sahibi təsdiqlənib',
    pendingLabel: 'Ev sahibi statusu yoxlanılır',
    icon: ShieldCheck,
  },
};

export interface VerifiedBadgeProps {
  kind: VerificationKind;
  /** `verified` təsdiqlənib, `pending` gözləyir, `none` heç başlanmayıb. */
  status?: 'verified' | 'pending' | 'none';
  className?: string;
}

/**
 * "✓ Tələbə təsdiqlənib" tipli nişan.
 *
 * `none` halında heç nə göstərilmir: təsdiqlənməmiş statusu qırmızı nişanla
 * vurğulamaq istifadəçini günahlandırmaq kimi oxunur. Yalnız öz profilində
 * `showNone` ilə açıq şəkildə göstərilir.
 */
export function VerifiedBadge({ kind, status = 'verified', className }: VerifiedBadgeProps) {
  const config = verifications[kind];

  if (status === 'none') return null;

  if (status === 'pending') {
    return (
      <Badge tone="warning" icon={Clock} className={className}>
        {config.pendingLabel}
      </Badge>
    );
  }

  return (
    <Badge tone="accent" icon={config.icon} className={className}>
      {config.label}
    </Badge>
  );
}

/** Öz profilində "nə çatışmır" siyahısı — burada təsdiqlənməmiş hal da görünür. */
export function VerificationRow({
  kind,
  verified,
  className,
}: {
  kind: VerificationKind;
  verified: boolean;
  className?: string;
}) {
  const config = verifications[kind];
  const Icon = verified ? config.icon : X;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 text-sm',
        verified ? 'text-forest-700' : 'text-stone-500',
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          'grid size-5 shrink-0 place-items-center rounded-full',
          verified ? 'bg-sprout-100 text-forest-600' : 'bg-stone-100 text-stone-400',
        )}
      >
        <Icon className="size-3" />
      </span>
      {verified ? config.label : config.pendingLabel}
    </span>
  );
}
