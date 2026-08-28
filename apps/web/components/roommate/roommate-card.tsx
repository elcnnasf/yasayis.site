'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Cigarette, CigaretteOff, Moon, PawPrint, Users2 } from 'lucide-react';
import {
  FavoriteTarget,
  formatBudgetRange,
  Lifestyle,
  PetsAttitude,
  SmokingHabit,
  type RoommateCardDto,
} from '@yasayis/shared';
import { FavoriteButton } from '@/components/favorites/favorite-button';
import { VerifiedBadge } from '@/components/ui/badge';
import { Button, ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { MatchRing } from '@/components/ui/progress';
import { cn } from '@/lib/cn';

/**
 * Otaq yoldaşı kartı.
 *
 * Elan kartının insan variantıdır və eyni oxunuş sırasını izləyir:
 * KİM → HARADA OXUYUR → BÜDCƏ və RAYON → VƏRDİŞLƏR → UYĞUNLUQ.
 *
 * Uyğunluq faizi ƏN AXIRDADIR, sağ yuxarıda deyil. Səbəb: faiz yuxarıda
 * duranda kart "reytinq siyahısı" kimi oxunur və istifadəçi insanları
 * rəqəmə görə sıralamağa başlayır. Aşağıda duranda isə əvvəlcə adam, sonra
 * rəqəm görünür — və rəqəmin yanında onun nədən yarandığı yazılır.
 *
 * Vərdişlər üçüncü şəxsdə yazılır ("Siqaret çəkmir"), çünki kart BAŞQASINI
 * təsvir edir. Ortaq etiketlər ("Çəkmirəm") anket cavabıdır və burada səhv
 * səslənir — ona görə mətn burada ayrıca qurulur.
 */
export function RoommateCard({
  person,
  onConnect,
  busy,
  className,
}: {
  person: RoommateCardDto;
  /** Verilməsə kart yalnız göstərişdir — düymələr çıxmır (ana səhifə). */
  onConnect?: (userId: string) => void;
  busy?: boolean;
  className?: string;
}) {
  const href = `/otaq-yoldasi/profil/${person.userId}`;
  const traits = traitsOf(person);

  return (
    <Card className={cn('relative flex flex-col p-4', className)}>
      {/* Ürək sağ üstdə — elan kartındakı ilə eyni yerdə, eyni davranışla. */}
      <FavoriteButton
        target={FavoriteTarget.ROOMMATE}
        id={person.userId}
        label={person.fullName}
        className="absolute right-3 top-3 bg-transparent shadow-none backdrop-blur-none"
      />

      <div className="flex items-start gap-2 pr-8 sm:gap-3 sm:pr-9">
        <Avatar person={person} />

        <div className="min-w-0 flex-1">
          <Link
            href={href}
            className="block truncate text-sm font-semibold text-stone-900 transition-colors hover:text-forest-700 sm:text-body"
          >
            {person.fullName}
          </Link>

          {person.universityName && (
            <p className="mt-0.5 truncate text-2xs text-stone-500 sm:text-sm">
              {person.universityShortName ?? person.universityName}
              {person.majorName && ` · ${person.majorName}`}
            </p>
          )}
        </div>
      </div>

      <div className="mt-3">
        {person.budgetMin !== null && person.budgetMax !== null ? (
          <p className="tabular text-sm font-semibold text-stone-800 sm:text-body">
            {formatBudgetRange(person.budgetMin, person.budgetMax)}
          </p>
        ) : (
          <p className="text-sm text-stone-400 sm:text-body">Büdcə gizlidir</p>
        )}

        <p className="mt-0.5 truncate text-2xs text-stone-500 sm:text-sm">
          {person.districtNames.length > 0
            ? person.districtNames.slice(0, 2).join(', ')
            : (person.cityName ?? 'Bütün şəhər')}
        </p>
      </div>

      {traits.length > 0 && (
        <ul className="mt-3 flex flex-col gap-1.5">
          {traits.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-center gap-1.5 text-2xs text-stone-600 sm:gap-2 sm:text-sm">
              <Icon className="size-4 shrink-0 text-stone-400" strokeWidth={1.8} aria-hidden />
              <span className="truncate">{text}</span>
            </li>
          ))}
        </ul>
      )}

      {/* Təsdiq nişanları vərdişlərdən sonra: onlar profil haqqında deyil,
          profilin ETİBARI haqqındadır və ayrı qatdır. */}
      {(person.phoneVerified || person.studentVerified) && (
        <div className="mt-3 flex flex-wrap gap-1">
          {person.phoneVerified && <VerifiedBadge kind="phone" />}
          {person.studentVerified && <VerifiedBadge kind="student" />}
        </div>
      )}

      {person.matchScore !== null && (
        <div className="mt-auto flex items-center gap-2.5 border-t border-stone-200/70 pt-3.5">
          <MatchRing score={person.matchScore} size="sm" showCaption={false} />

          <div className="min-w-0">
            <p className="text-2xs font-medium text-stone-600 sm:text-sm">uyğun</p>
            {/* Rəqəm heç vaxt izahsız qalmır — layihənin qaydası. */}
            {person.matchReasons.length > 0 && (
              <p className="truncate text-2xs text-stone-500">{person.matchReasons[0]}</p>
            )}
          </div>
        </div>
      )}

      {onConnect && (
        <div className="mt-4 flex gap-2">
          <ButtonLink href={href} size="sm" variant="tertiary" fullWidth>
            Profilə bax
          </ButtonLink>
          <ConnectButton person={person} onConnect={onConnect} busy={busy} />
        </div>
      )}
    </Card>
  );
}

/**
 * Profil şəkli.
 *
 * Şəkil yoxdursa stok portret QOYULMUR — adın baş hərfi göstərilir. Uydurma üz
 * platformanın ən həssas vədini ("profillər təsdiqlənir") pozur.
 */
function Avatar({ person }: { person: RoommateCardDto }) {
  if (person.avatarUrl) {
    return (
      <span className="relative size-9 shrink-0 overflow-hidden rounded-full bg-stone-100 sm:size-12">
        <Image src={person.avatarUrl} alt="" fill sizes="48px" className="object-cover" />
      </span>
    );
  }

  return (
    <span
      aria-hidden
      className="grid size-9 shrink-0 place-items-center rounded-full bg-forest-100 font-display text-sm font-bold text-forest-700 sm:size-12 sm:text-lg"
    >
      {person.fullName.trim().charAt(0).toUpperCase()}
    </span>
  );
}

/** Kartda göstərilən üç vərdiş — hər biri üçüncü şəxsdə. */
function traitsOf(person: RoommateCardDto) {
  const out: { icon: typeof Moon; text: string }[] = [];

  if (person.lifestyle) {
    out.push({
      icon: person.lifestyle === Lifestyle.SOSIAL ? Users2 : Moon,
      text:
        person.lifestyle === Lifestyle.SAKIT
          ? 'Sakit yaşayış'
          : person.lifestyle === Lifestyle.SOSIAL
            ? 'Sosial yaşayış'
            : 'Yaşayış tərzi fərq etmir',
    });
  }

  if (person.smoking) {
    out.push({
      icon: person.smoking === SmokingHabit.CEKIREM ? Cigarette : CigaretteOff,
      text:
        person.smoking === SmokingHabit.CEKMIREM
          ? 'Siqaret çəkmir'
          : person.smoking === SmokingHabit.CEKIREM
            ? 'Siqaret çəkir'
            : 'Siqaret fərq etmir',
    });
  }

  if (person.petsAttitude) {
    out.push({
      icon: PawPrint,
      text:
        person.petsAttitude === PetsAttitude.SEVIREM
          ? 'Heyvanları sevir'
          : person.petsAttitude === PetsAttitude.PROBLEM_DEYIL
            ? 'Heyvanlar problem deyil'
            : 'Heyvan istəmir',
    });
  }

  return out;
}

function ConnectButton({
  person,
  onConnect,
  busy,
}: {
  person: RoommateCardDto;
  onConnect: (userId: string) => void;
  busy?: boolean;
}) {
  switch (person.matchStatus) {
    case 'ACCEPTED':
      return (
        <ButtonLink href="/otaq-yoldasi/uygunlasmalar" size="sm" fullWidth>
          Birlikdə axtar
        </ButtonLink>
      );
    case 'PENDING_SENT':
      return (
        <Button size="sm" variant="secondary" fullWidth disabled>
          Göndərilib
        </Button>
      );
    case 'PENDING_RECEIVED':
      return (
        <Button size="sm" fullWidth loading={busy} onClick={() => onConnect(person.userId)}>
          Qəbul et
        </Button>
      );
    case 'DECLINED':
      return null;
    default:
      return (
        <Button size="sm" fullWidth loading={busy} onClick={() => onConnect(person.userId)}>
          Əlaqə qur
        </Button>
      );
  }
}
