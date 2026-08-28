import Link from 'next/link';
import { Instagram, Mail, Music2 } from 'lucide-react';
import { BRAND, CONTACT_INFO } from '@yasayis/shared';
import { Wordmark } from '@/components/brand/logo';

/**
 * Sayt altlığı — TÜND səth.
 *
 * Başlıq və hero ilə eyni rəngdədir: səhifə yuxarıdan və aşağıdan eyni rəngə
 * bağlanır, ortadakı açıq məzmun isə onların arasında çərçivəyə alınmış kimi
 * oxunur.
 *
 * Dörd sütun, dörd fərqli niyyət: nə edə bilərəm (menyu), kimsiniz (şirkət),
 * qaydalar nədir (kömək), necə tapım (əlaqə). Sütunlar bir-birinə qarışmır —
 * "Qaydalar" linkini "Menyu"nun içinə atmaq istifadəçini gəzdirir.
 */

const columns = [
  {
    title: 'Menyu',
    links: [
      { href: '/axtaris', label: 'Ev & otaqlar' },
      { href: '/otaq-yoldasi', label: 'Otaq yoldaşı' },
      { href: '/elan/yeni', label: 'Elan yerləşdir' },
    ],
  },
  {
    title: 'Şirkət',
    links: [
      { href: '/haqqimizda', label: 'Haqqımızda' },
      { href: '/elaqe', label: 'Əlaqə' },
    ],
  },
  {
    title: 'Kömək',
    links: [
      { href: '/qaydalar', label: 'Qaydalar' },
      { href: '/mexfilik', label: 'Məxfilik' },
    ],
  },
];

/**
 * Yalnız doğrudan mövcud olan kanallar. Boş sosial ikon ölü link deməkdir.
 * Ünvanlar `@yasayis/shared`-dəki `CONTACT`-dan gəlir — footer və əlaqə
 * səhifəsi eyni mənbədən oxusun deyə.
 *
 * Telegram burada YOXDUR: kanal mövcud deyil. Lucide-də TikTok ikonu yoxdur,
 * ona görə musiqi notu (`Music2`) işlədilir — platformanın tanınan işarəsidir.
 */
const socials = [
  { href: CONTACT_INFO.instagram.url, label: 'Instagram', icon: Instagram },
  { href: CONTACT_INFO.tiktok.url, label: 'TikTok', icon: Music2 },
];

export function SiteFooter() {
  return (
    <footer className="mt-4 bg-ink-900 text-stone-300">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        {/*
          Mobil-də DÖRD SÜTUN: "Menyu", "Şirkət", "Kömək" və "Əlaqə" yan-yana
          durur. Əvvəl hamısı alt-alta idi və altlıq ekranda uzun bir siyahıya
          çevrilirdi — istifadəçi sonuncu linkə çatmaq üçün xeyli sürüşdürürdü.

          Bölmələr ayrıca `<div>`-ə YIĞILMIR: onda desktopda beş grid uşağı
          əvəzinə iki uşaq qalar və `lg:grid-cols-[...]` sıralaması pozulardı.
          Bunun yerinə mobildə şəbəkə dörd sütundur, brend bloku isə
          `col-span-4` ilə tam sətir tutur. `sm:`-dən yuxarı `sm:col-span-1`
          bunu sıfırlayır və desktop görünüşü toxunulmaz qalır.
        */}
        <div className="grid grid-cols-4 gap-x-3 gap-y-9 sm:grid-cols-2 sm:gap-10 lg:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))_minmax(0,1.2fr)]">
          <div className="col-span-4 sm:col-span-1">
            <span className="text-white">
              <Wordmark />
            </span>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-stone-400">
              {BRAND.tagline}.
            </p>

            <ul className="mt-5 flex gap-2">
              {socials.map((social) => {
                const Icon = social.icon;
                return (
                  <li key={social.href}>
                    <a
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={social.label}
                      className="grid size-9 place-items-center rounded-full text-stone-400 ring-1 ring-white/15 transition-colors hover:bg-white/10 hover:text-white"
                    >
                      <Icon className="size-4" strokeWidth={1.8} aria-hidden />
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>

          {columns.map((col) => (
            <nav key={col.title} aria-label={col.title} className="min-w-0">
              <p className="text-label uppercase text-stone-500">{col.title}</p>
              <ul className="mt-3 flex flex-col gap-2 sm:mt-4 sm:gap-2.5">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-2xs text-stone-400 transition-colors hover:text-white sm:text-sm"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          {/*
            Dörd sütunlu mobil şəbəkədə bu sütuna ~85px düşür, e-poçt ünvanı isə
            uzundur. Ona görə mobildə: ikon gizlənir, şrift kiçilir və ünvan
            `break-all` ilə sətirlərə bölünür — kəsilmir, oxunaqlı qalır.
            `sm:`-dən yuxarı ikon və ölçülər geri qayıdır.
          */}
          <div className="min-w-0">
            <p className="text-label uppercase text-stone-500">Əlaqə</p>
            <ul className="mt-4 flex flex-col gap-2.5">
              <li>
                <a
                  href={`mailto:${CONTACT_INFO.email}`}
                  className="flex items-center gap-2 break-all text-2xs text-stone-400 transition-colors hover:text-white sm:break-normal sm:text-sm"
                >
                  <Mail
                    className="hidden size-4 shrink-0 sm:block"
                    strokeWidth={1.8}
                    aria-hidden
                  />
                  {CONTACT_INFO.email}
                </a>
              </li>
              <li>
                <a
                  href={CONTACT_INFO.instagram.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 break-all text-2xs text-stone-400 transition-colors hover:text-white sm:break-normal sm:text-sm"
                >
                  <Instagram
                    className="hidden size-4 shrink-0 sm:block"
                    strokeWidth={1.8}
                    aria-hidden
                  />
                  {CONTACT_INFO.instagram.handle}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <p className="mt-12 border-t border-white/10 pt-6 text-center text-sm text-stone-500">
          © {new Date().getFullYear()} {BRAND.domain} — Bütün hüquqlar qorunur.
        </p>
      </div>
    </footer>
  );
}
