import type { Metadata } from 'next';
import { Instagram, Mail, Music2, ShieldAlert } from 'lucide-react';
import { CONTACT_INFO } from '@yasayis/shared';
import { ProsePage, ProseSection } from '@/components/layout/prose-page';
import { Panel } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'Əlaqə',
  description: 'Yasayis komandası ilə əlaqə — e-poçt, telefon və sosial şəbəkələr.',
};

/**
 * Əlaqə səhifəsi.
 *
 * Forma YOXDUR, qəsdən: göndərilən formanı oxuyacaq daxili sistem hələ
 * qurulmayıb və cavabsız qalan forma e-poçtdan pisdir. Birbaşa kanallar
 * göstərilir — hamısı işlək linkdir.
 */

/**
 * Kanallar `@yasayis/shared`-dəki `CONTACT`-dan gəlir — footer ilə eyni mənbə.
 *
 * Burada YALNIZ işlək kanal var. Telefon və Telegram QƏSDƏN yoxdur: hər ikisi
 * əvvəl uydurma dəyərlə göstərilirdi və yazan adam cavab ala bilmirdi.
 */
const channels = [
  {
    icon: Mail,
    label: 'E-poçt',
    value: CONTACT_INFO.email,
    href: `mailto:${CONTACT_INFO.email}`,
    note: 'Ümumi suallar və əməkdaşlıq. Adətən 1–2 iş günü içində cavablandırırıq.',
  },
  {
    icon: Instagram,
    label: 'Instagram',
    value: CONTACT_INFO.instagram.handle,
    href: CONTACT_INFO.instagram.url,
    note: 'Yeni elanlar və ən sürətli cavab kanalı.',
  },
  {
    icon: Music2,
    label: 'TikTok',
    value: CONTACT_INFO.tiktok.handle,
    href: CONTACT_INFO.tiktok.url,
    note: 'Tələbə yaşayışı barədə qısa videolar.',
  },
];

export default function ContactPage() {
  return (
    <ProsePage
      title="Əlaqə"
      intro="Sualın, təklifin və ya şikayətin varsa bizə yaz — hamısını oxuyuruq."
    >
      <ul className="grid gap-3 sm:grid-cols-2">
        {channels.map((c) => {
          const Icon = c.icon;
          const external = c.href.startsWith('http');

          return (
            <li key={c.label}>
              <a
                href={c.href}
                {...(external
                  ? { target: '_blank', rel: 'noopener noreferrer' }
                  : {})}
                className="flex h-full flex-col rounded-[var(--radius-card)] bg-white p-4 ring-1 ring-stone-200 transition-shadow hover:shadow-[var(--shadow-card)] hover:ring-stone-300"
              >
                <span className="flex items-center gap-2.5">
                  <span
                    aria-hidden
                    className="grid size-9 shrink-0 place-items-center rounded-[var(--radius-input)] bg-forest-50 text-forest-700"
                  >
                    <Icon className="size-4" strokeWidth={1.8} />
                  </span>
                  <span>
                    <span className="block text-2xs font-semibold uppercase tracking-wide text-stone-500">
                      {c.label}
                    </span>
                    <span className="block text-body font-semibold text-stone-900">
                      {c.value}
                    </span>
                  </span>
                </span>
                <span className="mt-3 text-sm leading-relaxed text-stone-600">
                  {c.note}
                </span>
              </a>
            </li>
          );
        })}
      </ul>

      <ProseSection title="Elandan şikayət">
        <p>
          Konkret elan və ya profil barədə şikayətin varsa, bura yazmaq əvəzinə o
          səhifədəki <strong>&ldquo;Şikayət et&rdquo;</strong> düyməsindən istifadə et.
          Şikayət birbaşa moderasiyaya düşür və elanla birlikdə baxılır — e-poçtla
          gələn şikayət isə növbəyə düşür və gec baxılır.
        </p>
      </ProseSection>

      <Panel className="flex gap-3 bg-warning-50 p-4 ring-warning-100">
        <ShieldAlert
          className="mt-0.5 size-5 shrink-0 text-warning-600"
          strokeWidth={1.9}
          aria-hidden
        />
        <p className="text-sm leading-relaxed text-stone-700">
          Yasayis <strong>vasitəçi deyil</strong> və heç bir ödənişi qəbul etmir.
          Kimsə platformanın adından beh və ya komissiya istəyirsə, bu saxtakarlıqdır —
          dərhal bizə bildirin.
        </p>
      </Panel>
    </ProsePage>
  );
}
