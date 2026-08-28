import { cn } from '@/lib/cn';

/**
 * Uyğunluq göstəriciləri.
 *
 * Rəqəm heç vaxt tək başına göstərilmir — skorun yanında onun haradan gəldiyini
 * izah edən mətn olmalıdır ("Hər ikiniz siqaret çəkmirsiniz"). "Qara qutu" skor
 * qadağandır. Bu qayda `MatchSummary` komponentində strukturla məcburidir.
 */

type Tier = 'high' | 'mid' | 'low';

function tierOf(score: number): Tier {
  if (score >= 70) return 'high';
  if (score >= 45) return 'mid';
  return 'low';
}

const trackColor = 'text-stone-200';
const tierStroke: Record<Tier, string> = {
  high: 'text-sprout-500',
  mid: 'text-forest-300',
  low: 'text-stone-400',
};
const tierText: Record<Tier, string> = {
  high: 'text-forest-600',
  mid: 'text-forest-500',
  low: 'text-stone-600',
};

// ---------------------------------------------------------------------------
// Dairəvi
// ---------------------------------------------------------------------------

export interface MatchRingProps {
  /** 0–100 */
  score: number;
  size?: 'sm' | 'md' | 'lg';
  /** Faizin altında kiçik yazı: "uyğunluq" */
  showCaption?: boolean;
  className?: string;
}

const ringSizes = {
  sm: { box: 'size-12', stroke: 4, text: 'text-sm', caption: false },
  md: { box: 'size-16', stroke: 5, text: 'text-h3', caption: true },
  lg: { box: 'size-24', stroke: 6, text: 'text-h1', caption: true },
} as const;

export function MatchRing({
  score,
  size = 'md',
  showCaption,
  className,
}: MatchRingProps) {
  const clamped = Math.min(100, Math.max(0, Math.round(score)));
  const tier = tierOf(clamped);
  const cfg = ringSizes[size];

  // 100 vahidlik viewBox: radius elə seçilir ki, xətt kənardan kəsilməsin.
  const radius = 50 - cfg.stroke / 2 - 1;
  const circumference = 2 * Math.PI * radius;
  const filled = (clamped / 100) * circumference;
  const caption = showCaption ?? cfg.caption;

  return (
    <div
      className={cn('relative shrink-0', cfg.box, className)}
      role="img"
      aria-label={`${clamped} faiz uyğunluq`}
    >
      <svg viewBox="0 0 100 100" className="size-full -rotate-90">
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          strokeWidth={cfg.stroke}
          className={trackColor}
          stroke="currentColor"
        />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          strokeWidth={cfg.stroke}
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circumference - filled}`}
          className={cn(tierStroke[tier], 'transition-[stroke-dasharray] duration-500')}
          stroke="currentColor"
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span className={cn('tabular font-extrabold', cfg.text, tierText[tier])}>
          {clamped}
          <span className="text-[0.6em] font-bold">%</span>
        </span>
        {caption && (
          <span className="mt-0.5 text-2xs font-medium text-stone-500">uyğunluq</span>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Xətti
// ---------------------------------------------------------------------------

export interface MatchBarProps {
  score: number;
  /** Solda göstərilən amil adı: "Həyat tərzi" */
  label?: string;
  /** Sağda faiz göstərilsin */
  showValue?: boolean;
  className?: string;
}

export function MatchBar({ score, label, showValue = true, className }: MatchBarProps) {
  const clamped = Math.min(100, Math.max(0, Math.round(score)));
  const tier = tierOf(clamped);

  return (
    <div className={cn('flex items-center gap-3', className)}>
      {label && (
        <span className="w-28 shrink-0 truncate text-sm text-stone-700 sm:w-32">{label}</span>
      )}
      <div
        className="h-2 min-w-0 flex-1 overflow-hidden rounded-[var(--radius-chip)] bg-stone-200"
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? 'Uyğunluq'}
      >
        <div
          className={cn(
            'h-full rounded-[var(--radius-chip)] transition-[width] duration-500',
            tier === 'high' ? 'bg-sprout-500' : tier === 'mid' ? 'bg-forest-300' : 'bg-stone-400',
          )}
          style={{ width: `${clamped}%` }}
        />
      </div>
      {showValue && (
        <span className="tabular w-9 shrink-0 text-right text-sm font-semibold text-stone-600">
          {clamped}%
        </span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Ümumi irəliləyiş (profil doluluğu, addım göstəricisi)
// ---------------------------------------------------------------------------

export function ProgressBar({
  value,
  max = 100,
  label,
  className,
}: {
  value: number;
  max?: number;
  label?: string;
  className?: string;
}) {
  const percent = Math.min(100, Math.max(0, Math.round((value / max) * 100)));

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-sm font-medium text-stone-700">{label}</span>
          <span className="tabular text-sm font-semibold text-forest-600">{percent}%</span>
        </div>
      )}
      <div
        className="h-1.5 overflow-hidden rounded-[var(--radius-chip)] bg-stone-200"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? 'İrəliləyiş'}
      >
        <div
          className="h-full rounded-[var(--radius-chip)] bg-forest-600 transition-[width] duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Skor + izah (birlikdə)
// ---------------------------------------------------------------------------

export interface MatchSummaryProps {
  score: number;
  /** Uyğun gələn amillər — ən çox 2 ədəd. */
  matches: string[];
  /** Fərqlənən amil — yoxdursa göstərilmir. */
  difference?: string | null;
  className?: string;
}

/**
 * Skoru izahı ilə birlikdə göstərir.
 *
 * `matches` boş ola bilər, amma komponent onsuz da izah tələb edən quruluşdadır:
 * skoru izahsız göstərmək üçün ayrıca komponent yoxdur — bu qəsdəndir.
 */
export function MatchSummary({ score, matches, difference, className }: MatchSummaryProps) {
  return (
    <div className={cn('flex items-start gap-4', className)}>
      <MatchRing score={score} size="md" />
      <ul className="min-w-0 flex-1 space-y-1 pt-1">
        {matches.map((text) => (
          <li key={text} className="flex gap-2 text-sm text-stone-700">
            <span aria-hidden className="font-bold text-sprout-600">
              +
            </span>
            <span className="min-w-0">{text}</span>
          </li>
        ))}
        {difference && (
          <li className="flex gap-2 text-sm text-stone-600">
            <span aria-hidden className="font-bold text-warning-500">
              ≠
            </span>
            <span className="min-w-0">{difference}</span>
          </li>
        )}
      </ul>
    </div>
  );
}
