import {
  BellPlus,
  Heart,
  Inbox,
  MapPinOff,
  SearchX,
  SlidersHorizontal,
  UserRoundPlus,
  Users,
  type LucideIcon,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { Button, ButtonLink } from '@/components/ui/button';
import { cn } from '@/lib/cn';

/**
 * Boş nəticə ekranları.
 *
 * Ton qaydası: boş ekran istifadəçinin səhvi kimi oxunmamalıdır. Ona görə
 *   · qırmızı rəng və xəbərdarlıq ikonu işlədilmir;
 *   · mətn nə baş verdiyini deyir, günahlandırmır;
 *   · həmişə ən azı bir irəli yol göstərilir.
 *
 * Bütün siyahı və axtarış ekranları (D4, E1) bu komponentləri təkrar işlədir —
 * boş ekranın görünüşü bir yerdə dəyişir.
 */

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  /** Düymələr və ya digər hərəkətlər. */
  actions?: ReactNode;
  /** Kart çərçivəsi olmadan, siyahının içində göstər. */
  bare?: boolean;
  className?: string;
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  actions,
  bare,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center px-6 py-12 text-center sm:py-16',
        !bare &&
          'rounded-[var(--radius-panel)] bg-white ring-1 ring-stone-200/70 shadow-[var(--shadow-card)]',
        className,
      )}
    >
      <span
        aria-hidden
        className="grid size-14 place-items-center rounded-full bg-sprout-100 text-forest-600"
      >
        <Icon className="size-6" strokeWidth={1.75} />
      </span>

      <p className="mt-5 max-w-md text-balance text-h3 text-stone-900">{title}</p>

      {description && (
        <p className="mt-2 max-w-md text-pretty text-body leading-relaxed text-stone-600">
          {description}
        </p>
      )}

      {actions && (
        <div className="mt-6 flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:justify-center">
          {actions}
        </div>
      )}
    </div>
  );
}

// ===========================================================================
//  Hazır hallar
// ===========================================================================

/**
 * Filtrlə uyğun elan tapılmadı.
 * "Axtarış bildirişi yarat" istifadəçinin cari filtrini SearchAlert kimi saxlayır.
 */
export function NoListingsFound({
  onChangeFilters,
  onCreateAlert,
  alertHref = '/panel/axtaris-bildirisleri',
  className,
}: {
  onChangeFilters?: () => void;
  onCreateAlert?: () => void;
  alertHref?: string;
  className?: string;
}) {
  return (
    <EmptyState
      icon={SearchX}
      title="Bu filterlə uyğun elan tapılmadı."
      description="Filterləri bir az genişləndirsəniz, nəticə çıxa bilər. Ya da bu axtarışı yadda saxlayın — uyğun elan yerləşəndə sizə bildiriş göndərək."
      className={className}
      actions={
        <>
          {onChangeFilters && (
            <Button variant="primary" onClick={onChangeFilters}>
              <SlidersHorizontal className="size-4" aria-hidden />
              Filterləri dəyiş
            </Button>
          )}
          {onCreateAlert ? (
            <Button variant="tertiary" onClick={onCreateAlert}>
              <BellPlus className="size-4" aria-hidden />
              Axtarış bildirişi yarat
            </Button>
          ) : (
            <ButtonLink href={alertHref} variant="tertiary">
              <BellPlus className="size-4" aria-hidden />
              Axtarış bildirişi yarat
            </ButtonLink>
          )}
        </>
      }
    />
  );
}

/**
 * Uyğun otaq yoldaşı tapılmadı.
 * Profil nə qədər dolu olsa, uyğunluq bir o qədər dəqiq hesablanır — mesaj bunu izah edir.
 */
export function NoRoommatesFound({
  profileHref = '/profil',
  onChangeFilters,
  className,
}: {
  profileHref?: string;
  onChangeFilters?: () => void;
  className?: string;
}) {
  return (
    <EmptyState
      icon={Users}
      title="Hazırda uyğun profil tapılmadı."
      /*
        Mətn əvvəl "Profil məlumatlarını tamamla" ilə başlayırdı və bu, bölməyə
        GİRİŞ ŞƏRTİ kimi oxunurdu — halbuki otaq yoldaşı axtarışı profilsiz də
        işləyir, profil yalnız uyğunluq FAİZİNİ dəqiqləşdirir. İndi əsas səbəb
        (hələ az profil var) öndədir, profil isə təklif kimi qalır.
      */
      description="Bölmə yenidir və hələ az tələbə profili var. Filtrləri genişləndirib yenidən baxın — profilinizi tamamlasanız, uyğunluq faizi də dəqiqləşəcək."
      className={className}
      actions={
        <>
          <ButtonLink href={profileHref} variant="tertiary">
            <UserRoundPlus className="size-4" aria-hidden />
            Profili tamamla
          </ButtonLink>
          {onChangeFilters && (
            <Button variant="tertiary" onClick={onChangeFilters}>
              <SlidersHorizontal className="size-4" aria-hidden />
              Filterləri dəyiş
            </Button>
          )}
        </>
      }
    />
  );
}

/** Saxlanılanlar bölməsi boşdur. */
export function NoSavedItems({ className }: { className?: string }) {
  return (
    <EmptyState
      icon={Heart}
      title="Hələ heç nə saxlamamısınız."
      description="Bəyəndiyiniz elanı və ya otaq yoldaşı profilini ürək işarəsi ilə saxlayın — sonra buradan asanlıqla tapacaqsınız."
      className={className}
      actions={<ButtonLink href="/axtaris">Elanlara bax</ButtonLink>}
    />
  );
}

/** Ev sahibinin hələ elanı yoxdur. */
export function NoOwnListings({ className }: { className?: string }) {
  return (
    <EmptyState
      icon={MapPinOff}
      title="Hələ elanınız yoxdur."
      description="İlk elanınızı yerləşdirin — moderasiyadan keçəndən sonra tələbələr onu görəcək."
      className={className}
      actions={<ButtonLink href="/elan/yeni">Elan yerləşdir</ButtonLink>}
    />
  );
}

/**
 * Şəhərdə heç bir elan yoxdur (filtr məsələsi deyil).
 * Bakıdan kənar şəhərlərdə ilk mərhələdə normal haldır — mətn bunu gizlətmir.
 */
export function NoListingsInCity({
  cityName,
  alertHref = '/panel/axtaris-bildirisleri',
  className,
}: {
  cityName: string;
  alertHref?: string;
  className?: string;
}) {
  return (
    <EmptyState
      icon={MapPinOff}
      title={`${cityName} üçün hələ elan yoxdur.`}
      description="Bu şəhərdə platforma yeni başlayır. Bildiriş yaradın — ilk elan yerləşən kimi xəbər verək."
      className={className}
      actions={
        <>
          <ButtonLink href={alertHref}>
            <BellPlus className="size-4" aria-hidden />
            Axtarış bildirişi yarat
          </ButtonLink>
          <ButtonLink href="/axtaris" variant="tertiary">
            Başqa şəhərlərə bax
          </ButtonLink>
        </>
      }
    />
  );
}
