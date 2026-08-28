import { GraduationCap, Users, Wallet } from 'lucide-react';
import { PILLARS, type Pillar } from '@yasayis/shared';
import { Panel } from '@/components/ui/card';

/**
 * "Niyə Yasayis?" — üç sütun, TƏK kartın içində.
 *
 * Üç ayrı kart əvəzinə bir kart: bunlar üç fərqli təklif deyil, eyni vədin üç
 * hissəsidir. Ayrı kartlarda oxucu onları müqayisə etməyə başlayır ("hansı
 * daha yaxşıdır?"), bir kartda isə birlikdə oxuyur.
 *
 * Başlıq sütunların ÜSTÜNDƏ deyil, SOLUNDADIR: bölmə səhifədə izahat rolu
 * daşıyır və üstdən başlıq qoysaydıq elan bölmələri qədər ağır görünərdi.
 *
 * Mətn `packages/shared/src/marketing.ts` faylından gəlir ki, ana səhifə, meta
 * təsvir və sosial bio eyni şeyi desin.
 *
 * Emoji YOX, minimal xətt ikonları: emoji hər cihazda başqa cür görünür və
 * səhifəyə idarə edilməyən rəng gətirir — palitranı tək tonlu saxlamaq
 * qərarına ziddir.
 */

const PILLAR_ICONS: Record<Pillar['key'], typeof GraduationCap> = {
  university: GraduationCap,
  budget: Wallet,
  roommate: Users,
};

export function WhyYasayis() {
  return (
    <section className="section-tight mx-auto max-w-7xl px-4 sm:px-6">
      <Panel className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[minmax(0,12rem)_minmax(0,1fr)] lg:items-start lg:gap-10">
        <h2 className="text-h2 text-stone-900">Niyə Yasayis?</h2>

        {/* Sütunlar arasında incə ayırıcı — kartın içində üç sahə olduğunu
            çərçivə çəkmədən bildirir. */}
        <div className="grid gap-6 sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-stone-200/70">
          {PILLARS.map((pillar, index) => {
            const Icon = PILLAR_ICONS[pillar.key];

            return (
              <div
                key={pillar.key}
                className={index === 0 ? 'sm:pr-6' : 'sm:px-6 last:sm:pr-0'}
              >
                <div className="flex items-start gap-3">
                  <span
                    aria-hidden
                    className="grid size-10 shrink-0 place-items-center rounded-[var(--radius-input)] bg-forest-50 text-forest-700"
                  >
                    <Icon className="size-5" strokeWidth={1.75} />
                  </span>

                  <div className="min-w-0">
                    <h3 className="text-h3 text-stone-900">{pillar.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-stone-600">
                      {pillar.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Panel>
    </section>
  );
}
