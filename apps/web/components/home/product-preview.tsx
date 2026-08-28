import Image from 'next/image';
import { Heart, Menu, Search } from 'lucide-react';
import { MatchRing } from '@/components/ui/progress';

/**
 * Hero illüstrasiyasının şəkli.
 *
 * Nümunə elan datası ilə birlikdə silinən modulda idi. Bura köçürüldü, çünki
 * bu, ELAN DATASI DEYİL — hero-nun dekorativ şəklidir: `role="img"` daxilində
 * dayanır, kliklənmir və heç bir yerdə real elan kimi təqdim edilmir.
 */
const PREVIEW_PHOTO = '/demo/menzil-1.png';

/**
 * Hero-nun sağındakı məhsul önizləməsi.
 *
 * Dekorativ illüstrasiya deyil, QƏSDƏN: böyük ev ikonu "bu, daşınmaz əmlak
 * saytıdır" deyir və bizi rəqiblərdən ayırmır. Burada isə platformanın iki
 * əsas obyekti — ELAN və OTAQ YOLDAŞI — yan-yana, bir ekranın içində dayanır.
 * İstifadəçi ilk baxışda görür ki, Yasayis həm ev, həm də insan tapır; bu,
 * səhifədəki bütün mətndən tez oxunur.
 *
 * Bu komponent statikdir və seçilmiş nümunə göstərir. Ona görə:
 *   · ekran oxuyucu üçün bir dəfə izah verilir, kartlar ayrıca oxunmur;
 *   · heç bir rəqəm "statistika" kimi təqdim edilmir — bunlar məhsulun necə
 *     göründüyünü izah edən nümunələrdir, bazadan gələn məlumat deyil;
 *   · klikləna bilən heç nə yoxdur, çünki işlək görünüb işləməyən UI
 *     istifadəçini aldadır.
 */
export function ProductPreview() {
  return (
    <div
      // Şəkil kimi oxunur: içindəki mətn ayrı-ayrı elan kimi səslənməsin.
      role="img"
      aria-label="Yasayis interfeysi: təklif olunan ev elanı və yanında uyğunluq faizi göstərilən otaq yoldaşı profili"
      className="select-none rounded-[1.75rem] bg-ink-800 p-2.5 shadow-[var(--shadow-pop)] ring-1 ring-white/10"
    >
      <BrowserBar />

      <div className="mt-2.5 grid gap-2.5 rounded-[1.375rem] bg-white p-2.5 sm:grid-cols-[1.15fr_1fr]">
        <PreviewPanel label="Təklif olunan ev">
          <ListingPreview />
        </PreviewPanel>

        <PreviewPanel label="Uyğun otaq yoldaşı">
          <RoommatePreview />
        </PreviewPanel>
      </div>
    </div>
  );
}

/** Tətbiqin öz başlığı — önizləməni "ekran" kimi oxudur. */
function BrowserBar() {
  return (
    <div className="flex items-center gap-3 px-2 py-1.5">
      <span className="font-display text-sm font-bold uppercase tracking-[0.06em] text-white">
        Yasayis
      </span>

      <span className="flex h-7 flex-1 items-center gap-2 rounded-[var(--radius-chip)] bg-white/[0.07] px-3 text-2xs text-stone-400 ring-1 ring-white/10">
        <Search className="size-3 shrink-0" aria-hidden />
        Axtarış et...
      </span>

      <Heart className="size-4 shrink-0 text-stone-400" strokeWidth={1.8} aria-hidden />
      <Menu className="size-4 shrink-0 text-stone-400" strokeWidth={1.8} aria-hidden />
    </div>
  );
}

/** İki panelin ortaq çərçivəsi — başlıq + məzmun. */
function PreviewPanel({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[1rem] bg-stone-50 p-3 ring-1 ring-stone-200/70">
      <p className="text-label uppercase text-stone-500">{label}</p>
      <div className="mt-2.5">{children}</div>
    </div>
  );
}

function ListingPreview() {
  return (
    <div>
      <div className="relative aspect-[16/10] overflow-hidden rounded-[0.75rem] bg-stone-200">
        <Image
          src={PREVIEW_PHOTO}
          alt=""
          fill
          sizes="320px"
          className="object-cover"
          priority
        />
        <span
          aria-hidden
          className="absolute right-2 top-2 grid size-7 place-items-center rounded-full bg-white/90 text-stone-600 shadow-[var(--shadow-xs)]"
        >
          <Heart className="size-3.5" strokeWidth={1.9} />
        </span>
      </div>

      <p className="mt-2.5 text-body font-semibold text-stone-900">2 otaqlı mənzil</p>
      <p className="mt-0.5 text-sm text-stone-500">Nərimanov, Bakı</p>
      <p className="tabular mt-1 text-body font-bold text-sprout-600">300 AZN / ay</p>

      <ChipRow items={['Tələbələr üçün', 'Wi-Fi', 'Mebel']} />
    </div>
  );
}

function RoommatePreview() {
  return (
    <div>
      <div className="flex items-center gap-2.5">
        <LetterAvatar letter="A" />
        <div className="min-w-0">
          <p className="text-body font-semibold text-stone-900">Aysel</p>
          <p className="truncate text-2xs text-stone-500">BDU · Kompüter elmləri</p>
        </div>
      </div>

      <p className="tabular mt-2.5 text-sm text-stone-700">250–300 AZN</p>
      <p className="text-sm text-stone-500">Nərimanov</p>

      <ChipRow items={['Sakit yaşayış', 'Siqaret çəkmir', 'Heyvanları sevir']} />

      <div className="mt-3 flex items-center gap-2 border-t border-stone-200/70 pt-3">
        <MatchRing score={92} size="sm" />
        <span className="text-sm text-stone-600">uyğun</span>
      </div>
    </div>
  );
}

/**
 * Nümunə avatarı — hərf.
 *
 * Stok portret işlədilmir: real olmayan üzü real profil kimi göstərmək
 * platformanın ən həssas vədini (profillər təsdiqlənir) ilk ekranda pozur.
 */
function LetterAvatar({ letter }: { letter: string }) {
  return (
    <span
      aria-hidden
      className="grid size-9 shrink-0 place-items-center rounded-full bg-forest-100 font-display text-body font-bold text-forest-700"
    >
      {letter}
    </span>
  );
}

function ChipRow({ items }: { items: string[] }) {
  return (
    <ul className="mt-2.5 flex flex-wrap gap-1.5">
      {items.map((item) => (
        <li
          key={item}
          className="rounded-[var(--radius-chip)] bg-white px-2 py-1 text-2xs font-medium text-stone-600 ring-1 ring-stone-200"
        >
          {item}
        </li>
      ))}
    </ul>
  );
}
