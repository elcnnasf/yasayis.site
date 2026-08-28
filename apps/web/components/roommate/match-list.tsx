'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Check, Clock, GraduationCap, UserRound, Users, X } from 'lucide-react';
import type { RoommateMatchDto } from '@yasayis/shared';
import { api, ApiRequestError } from '@/lib/api-client';
import { EmptyState } from '@/components/empty/empty-state';
import { Badge } from '@/components/ui/badge';
import { Button, ButtonLink } from '@/components/ui/button';
import { Card, Skeleton } from '@/components/ui/card';
import { MatchRing } from '@/components/ui/progress';

/**
 * Otaq yoldaşı uyğunlaşmaları.
 *
 * Üç qrup ayrıca göstərilir və sıra QƏSDƏNdir:
 *   1. Sənə gələn təkliflər — cavab gözləyir, ən vacibi budur
 *   2. Qəbul edilənlər     — burada iş davam edir ("Birlikdə axtar")
 *   3. Göndərdiyin         — sadəcə gözləyirsən, hərəkət tələb etmir
 *
 * Hamısını bir siyahıda qarışdırsaq, cavab gözləyən təklif aşağıda qalıb
 * cavabsız qalır — və bu, platformanın əsas axınının dayandığı yerdir.
 */

type Group = { key: string; title: string; note: string; items: RoommateMatchDto[] };

export function MatchList() {
  const [matches, setMatches] = useState<RoommateMatchDto[] | null>(null);
  const [guest, setGuest] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(() => {
    api
      .get<RoommateMatchDto[]>('/roommates/matches')
      .then((rows) => {
        setMatches(rows);
        setGuest(false);
      })
      .catch((e: unknown) => {
        if (e instanceof ApiRequestError && (e.status === 401 || e.status === 403)) {
          setGuest(true);
        }
        setMatches([]);
      });
  }, []);

  useEffect(load, [load]);

  const respond = async (id: string, accept: boolean) => {
    setBusyId(id);
    try {
      await api.post(`/roommates/matches/${id}/respond`, { accept });
      load();
    } catch {
      // Xəta olsa siyahı dəyişmir — istifadəçi yenidən cəhd edə bilər.
    }
    setBusyId(null);
  };

  if (guest) {
    return (
      <EmptyState
        icon={Users}
        title="Uyğunlaşmaları görmək üçün daxil ol."
        description="Kimin sənə təklif göndərdiyini yalnız öz hesabında görə bilərsən."
        actions={
          <>
            <ButtonLink href="/giris?davam=/otaq-yoldasi/uygunlasmalar">Daxil ol</ButtonLink>
            <ButtonLink href="/otaq-yoldasi" variant="tertiary">
              Profillərə bax
            </ButtonLink>
          </>
        }
      />
    );
  }

  if (matches === null) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-[var(--radius-card)]" />
        ))}
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="Hələ uyğunlaşman yoxdur."
        description="Otaq yoldaşı bölməsində profillərə bax və uyğun gördüyünə əlaqə təklifi göndər. Qarşı tərəf qəbul edəndə burada görünəcək."
        actions={<ButtonLink href="/otaq-yoldasi">Otaq yoldaşlarını kəşf et</ButtonLink>}
      />
    );
  }

  const groups: Group[] = [
    {
      key: 'incoming',
      title: 'Sənə gələn təkliflər',
      note: 'Cavab gözləyir.',
      items: matches.filter((m) => m.status === 'PENDING' && !m.initiatedByMe),
    },
    {
      key: 'accepted',
      title: 'Qəbul edilənlər',
      note: 'Birlikdə ev axtara bilərsiniz.',
      items: matches.filter((m) => m.status === 'ACCEPTED'),
    },
    {
      key: 'sent',
      title: 'Göndərdiyin təkliflər',
      note: 'Qarşı tərəfin cavabını gözləyir.',
      items: matches.filter((m) => m.status === 'PENDING' && m.initiatedByMe),
    },
  ].filter((g) => g.items.length > 0);

  return (
    <div className="flex flex-col gap-8">
      {groups.map((group) => (
        <section key={group.key}>
          <h2 className="text-h2 text-stone-900">{group.title}</h2>
          <p className="mt-1 text-sm text-stone-600">{group.note}</p>

          <ul className="mt-4 flex flex-col gap-3">
            {group.items.map((match) => (
              <li key={match.id}>
                <MatchRow
                  match={match}
                  busy={busyId === match.id}
                  onRespond={respond}
                />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function MatchRow({
  match,
  busy,
  onRespond,
}: {
  match: RoommateMatchDto;
  busy: boolean;
  onRespond: (id: string, accept: boolean) => void;
}) {
  const { partner } = match;

  return (
    <Card className="flex flex-wrap items-center gap-4 p-4">
      <Avatar url={partner.avatarUrl} name={partner.fullName} />

      <div className="min-w-0 flex-1">
        <Link
          href={`/otaq-yoldasi/profil/${partner.userId}`}
          className="block truncate text-body font-semibold text-stone-900 transition-colors hover:text-forest-700"
        >
          {partner.fullName}
        </Link>

        {partner.universityShortName && (
          <p className="mt-0.5 flex items-center gap-1.5 text-sm text-stone-500">
            <GraduationCap className="size-3.5 shrink-0" aria-hidden />
            {partner.universityShortName}
          </p>
        )}

        {match.status === 'PENDING' && (
          <Badge tone="neutral" icon={Clock} size="sm" className="mt-1.5">
            Cavab gözlənilir
          </Badge>
        )}
      </div>

      {match.scoreAtMatch !== null && (
        <MatchRing score={match.scoreAtMatch} size="sm" showCaption={false} />
      )}

      <div className="flex w-full shrink-0 gap-2 sm:w-auto">
        {match.status === 'PENDING' && !match.initiatedByMe && (
          <>
            <Button size="sm" loading={busy} onClick={() => onRespond(match.id, true)}>
              <Check className="size-4" aria-hidden />
              Qəbul et
            </Button>
            <Button
              size="sm"
              variant="tertiary"
              disabled={busy}
              onClick={() => onRespond(match.id, false)}
            >
              <X className="size-4" aria-hidden />
              İmtina
            </Button>
          </>
        )}

        {match.status === 'ACCEPTED' && (
          <ButtonLink href={`/otaq-yoldasi/birlikde/${match.id}`} size="sm">
            Birlikdə axtar
            <ArrowRight className="size-4" aria-hidden />
          </ButtonLink>
        )}

        {match.status === 'PENDING' && match.initiatedByMe && (
          <ButtonLink
            href={`/otaq-yoldasi/profil/${partner.userId}`}
            size="sm"
            variant="tertiary"
          >
            Profilə bax
          </ButtonLink>
        )}
      </div>
    </Card>
  );
}

function Avatar({ url, name }: { url: string | null; name: string }) {
  if (url) {
    return (
      <span className="relative size-12 shrink-0 overflow-hidden rounded-full bg-stone-100">
        <Image src={url} alt="" fill sizes="48px" className="object-cover" />
      </span>
    );
  }

  return (
    <span
      aria-hidden
      className="grid size-12 shrink-0 place-items-center rounded-full bg-forest-100 font-display text-lg font-bold text-forest-700"
    >
      {name.trim().charAt(0).toUpperCase() || <UserRound className="size-5" />}
    </span>
  );
}
