'use client';

import { useEffect, useState } from 'react';
import {
  Building2,
  Flag,
  Heart,
  MessageCircle,
  Search,
  TrendingUp,
  Users,
  UserRound,
} from 'lucide-react';
import type { AdminMetricsDto, FunnelDto } from '@yasayis/shared';
import { api } from '@/lib/api-client';
import { Panel, Skeleton, Well } from '@/components/ui/card';
import { Select } from '@/components/ui/field';
import { cn } from '@/lib/cn';

/**
 * Admin dashboard  (PROMPT G1)
 *
 * İki blok: vəziyyət metrikləri (indi neçə var) və konversiya hunisi
 * (istifadəçilər hara qədər gedir). Aktivlik rəqəmləri seçilmiş dövrə aiddir,
 * vəziyyət rəqəmləri isə həmişə cari andır — qarışmasın deyə ayrıca yazılıb.
 */
export function AdminDashboard() {
  const [days, setDays] = useState(30);
  const [metrics, setMetrics] = useState<AdminMetricsDto | null>(null);
  const [funnel, setFunnel] = useState<FunnelDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setFailed(false);

    Promise.all([
      api.get<AdminMetricsDto>('/admin/metrics', { days }),
      api.get<FunnelDto>('/admin/funnel', { days }),
    ])
      .then(([m, f]) => {
        if (cancelled) return;
        setMetrics(m);
        setFunnel(f);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [days]);

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    );
  }

  if (failed || !metrics || !funnel) {
    return (
      <Well className="text-sm text-stone-700">
        Göstəricilər yüklənmədi. Admin icazəniz olduğundan və bazanın qoşulu
        olduğundan əmin olun.
      </Well>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-h1 text-stone-900">Göstəricilər</h1>
        <Select
          aria-label="Dövr"
          value={String(days)}
          onChange={(e) => setDays(Number(e.target.value))}
          className="h-9 w-auto text-sm"
        >
          <option value="7">Son 7 gün</option>
          <option value="30">Son 30 gün</option>
          <option value="90">Son 90 gün</option>
          <option value="365">Son 1 il</option>
        </Select>
      </div>

      {/* --- İstifadəçilər --- */}
      <Section title="İstifadəçilər" note="Cari vəziyyət — dövrdən asılı deyil">
        <Metric icon={Users} label="Ümumi" value={metrics.users.total} />
        <Metric icon={UserRound} label="Tələbə" value={metrics.users.students} />
        <Metric icon={Building2} label="Ev sahibi" value={metrics.users.owners} />
        <Metric
          icon={Flag}
          label="Bloklanmış"
          value={metrics.users.suspended}
          tone={metrics.users.suspended > 0 ? 'warning' : 'neutral'}
        />
      </Section>

      {/* --- Elanlar --- */}
      <Section title="Elanlar" note="Cari vəziyyət">
        <Metric label="Aktiv" value={metrics.listings.active} tone="good" />
        <Metric
          label="Yoxlanılır"
          value={metrics.listings.pending}
          tone={metrics.listings.pending > 0 ? 'warning' : 'neutral'}
        />
        <Metric label="Rədd edilib" value={metrics.listings.rejected} />
        <Metric label="Müddəti bitib" value={metrics.listings.expired} />
        <Metric label="Dayandırılıb" value={metrics.listings.suspended} />
        <Metric label="Silinib" value={metrics.listings.deleted} />
        <Metric
          label="Şikayət olunub"
          value={metrics.listings.reported}
          tone={metrics.listings.reported > 0 ? 'warning' : 'neutral'}
        />
      </Section>

      {/* --- Otaq yoldaşı --- */}
      <Section title="Otaq yoldaşı" note="Cari vəziyyət">
        <Metric label="Profillər" value={metrics.roommates.profiles} />
        <Metric label="Görünən" value={metrics.roommates.visible} />
        <Metric label="Uyğunlaşma" value={metrics.roommates.matches} />
        <Metric
          label="Uğurlu uyğunlaşma"
          value={metrics.roommates.accepted}
          tone="good"
        />
      </Section>

      {/* --- Aktivlik --- */}
      <Section title="Aktivlik" note={`Son ${metrics.period.days} gün`}>
        <Metric icon={Search} label="Axtarışlar" value={metrics.activity.searches} />
        <Metric icon={Heart} label="Favoritlər" value={metrics.activity.favorites} />
        <Metric
          icon={MessageCircle}
          label="Başladılan əlaqələr"
          value={metrics.activity.contacts}
        />
        <Metric
          icon={Flag}
          label="Açıq şikayətlər"
          value={metrics.reports.open}
          tone={metrics.reports.open > 0 ? 'warning' : 'neutral'}
        />
      </Section>

      <Funnel funnel={funnel} days={metrics.period.days} />
    </div>
  );
}

// ---------------------------------------------------------------------------

function Section({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-3 flex items-baseline gap-3">
        <h2 className="text-h3 text-stone-900">{title}</h2>
        {note && <span className="text-2xs text-stone-500">{note}</span>}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{children}</div>
    </section>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  tone = 'neutral',
}: {
  icon?: typeof Users;
  label: string;
  value: number;
  tone?: 'neutral' | 'good' | 'warning';
}) {
  return (
    <Panel className="p-4">
      <div className="flex items-center gap-2">
        {Icon && <Icon className="size-4 shrink-0 text-stone-400" aria-hidden />}
        <p className="text-2xs uppercase tracking-wider text-stone-500">{label}</p>
      </div>
      <p
        className={cn(
          'tabular mt-1.5 font-display text-h1 font-semibold',
          tone === 'good' && 'text-forest-700',
          tone === 'warning' && 'text-warning-600',
          tone === 'neutral' && 'text-stone-900',
        )}
      >
        {value.toLocaleString('az-AZ')}
      </p>
    </Panel>
  );
}

/**
 * Konversiya hunisi.
 *
 * Zolağın eni BİRİNCİ addıma nisbətdədir — belə olanda hansı addımda ən çox
 * itki olduğu bir baxışda görünür.
 */
function Funnel({ funnel, days }: { funnel: FunnelDto; days: number }) {
  const max = funnel.steps[0]?.count ?? 0;

  return (
    <section>
      <div className="mb-3 flex items-baseline gap-3">
        <h2 className="text-h3 text-stone-900">Konversiya hunisi</h2>
        <span className="text-2xs text-stone-500">Son {days} gün</span>
      </div>

      <Panel className="p-5">
        <ol className="flex flex-col gap-3">
          {funnel.steps.map((step, index) => (
            <li key={step.key}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-body font-medium text-stone-800">
                  {index + 1}. {step.label}
                </span>
                <span className="tabular shrink-0 text-sm text-stone-600">
                  {step.count.toLocaleString('az-AZ')}
                  {index > 0 && (
                    <span
                      className={cn(
                        'ml-2 font-semibold',
                        step.conversionFromPrevious >= 50
                          ? 'text-forest-600'
                          : step.conversionFromPrevious >= 20
                            ? 'text-stone-600'
                            : 'text-warning-600',
                      )}
                    >
                      {step.conversionFromPrevious}%
                    </span>
                  )}
                </span>
              </div>
              <div className="mt-1.5 h-3 overflow-hidden rounded-[var(--radius-chip)] bg-stone-100">
                <div
                  className="h-full rounded-[var(--radius-chip)] bg-forest-600 transition-[width] duration-500"
                  style={{ width: `${max > 0 ? (step.count / max) * 100 : 0}%` }}
                />
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-6 border-t border-stone-200/70 pt-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="flex items-center gap-2 text-2xs uppercase tracking-wider text-stone-500">
                <TrendingUp className="size-3.5" aria-hidden />
                Uğurlu yaşayış bağlantısı
              </p>
              <p className="tabular mt-1 text-display font-extrabold text-forest-600">
                {funnel.successRate}%
              </p>
            </div>

            <dl className="grid grid-cols-3 gap-4 text-center">
              <Outcome label="Tapdım" value={funnel.outcomes.found} tone="good" />
              <Outcome label="Hələ axtarıram" value={funnel.outcomes.stillLooking} />
              <Outcome label="Cavab almadım" value={funnel.outcomes.noReply} tone="warning" />
            </dl>
          </div>

          <p className="mt-4 text-2xs leading-relaxed text-stone-500">
            Bu göstərici ödəniş və ya chat sistemindən deyil, əlaqədən 3 gün sonra
            istifadəçilərə göndərilən &quot;nəticə necə oldu?&quot; sorğusundan gəlir.
            Faiz yalnız cavab verənlər arasında hesablanır — cavabsızlar
            &quot;uğursuz&quot; sayılmır.
          </p>
        </div>
      </Panel>
    </section>
  );
}

function Outcome({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: number;
  tone?: 'neutral' | 'good' | 'warning';
}) {
  return (
    <div>
      <dd
        className={cn(
          'tabular font-display text-h2 font-semibold',
          tone === 'good' && 'text-forest-700',
          tone === 'warning' && 'text-warning-600',
          tone === 'neutral' && 'text-stone-700',
        )}
      >
        {value}
      </dd>
      <dt className="text-2xs text-stone-500">{label}</dt>
    </div>
  );
}
