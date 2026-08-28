'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { GraduationCap, Info, MapPin, ShieldAlert, UserRound, Wallet } from 'lucide-react';
import {
  formatBudgetRange,
  lifestyleLabels,
  petsAttitudeLabels,
  ReportTarget,
  roommateContactMessage,
  smokingHabitLabels,
  type MatchBreakdownDto,
  type PublicStudentProfileDto,
} from '@yasayis/shared';
import { api, ApiRequestError } from '@/lib/api-client';
import { ContactButton } from '@/components/shared/contact-button';
import { ReportButton } from '@/components/shared/report-dialog';
import { VerifiedBadge } from '@/components/ui/badge';
import { Panel, Skeleton, Well } from '@/components/ui/card';
import { MatchBar, MatchRing } from '@/components/ui/progress';

/**
 * Otaq yoldaşı profili.
 *
 * Gizli sahələr cavabda ümumiyyətlə gəlmir (bax: profil məxfiliyi), ona görə
 * burada yalnız mövcud olanlar göstərilir — "gizlədilib" yazısı ilə diqqət
 * çəkmək profil sahibini narahat vəziyyətə salardı.
 *
 * "Profili şikayət et" düyməsi burada olmalıdır: otaq yoldaşı təhlükəsizliyində
 * problem çox vaxt elanda deyil, şəxsin davranışındadır.
 */
export function RoommateProfile({ userId }: { userId: string }) {
  const [profile, setProfile] = useState<PublicStudentProfileDto | null>(null);
  const [match, setMatch] = useState<MatchBreakdownDto | null>(null);
  const [phone, setPhone] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    api
      .get<PublicStudentProfileDto>(`/profiles/${userId}`)
      .then((res) => {
        if (!cancelled) setProfile(res);
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setError(
            e instanceof ApiRequestError ? e.message : 'Profil yüklənmədi.',
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    // Uyğunluq izahı yalnız giriş etmiş tələbə üçün gəlir — xəta normaldır.
    api
      .get<MatchBreakdownDto>(`/roommates/match/${userId}/breakdown`)
      .then((res) => {
        if (!cancelled) setMatch(res);
      })
      .catch(() => undefined);

    // Telefon nömrəsi ayrıca gəlmir; hazırda yalnız elan detalında açılır.
    setPhone(null);

    // Təmizləmə YOX İDİ: `cancelled` bayrağı qurulurdu, amma heç vaxt
    // `true` olmurdu. Nəticədə istifadəçi cavab gəlməmiş başqa profilə
    // keçəndə köhnə sorğu qayıdıb yeni profilin üstündən yazırdı.
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (loading) return <Skeleton className="h-96" />;

  if (!profile) {
    return (
      <Well className="flex items-start gap-2.5">
        <Info className="mt-0.5 size-4 shrink-0 text-stone-500" aria-hidden />
        <p className="text-sm text-stone-700">{error ?? 'Profil tapılmadı.'}</p>
      </Well>
    );
  }

  const facts = [
    profile.lifestyle && { label: 'Yaşayış tərzi', value: lifestyleLabels[profile.lifestyle] },
    profile.smoking && { label: 'Siqaret', value: smokingHabitLabels[profile.smoking] },
    profile.petsAttitude && {
      label: 'Ev heyvanları',
      value: petsAttitudeLabels[profile.petsAttitude],
    },
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
      <div className="flex flex-col gap-6">
        <Panel className="p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <div className="relative size-20 shrink-0 overflow-hidden rounded-full bg-stone-100">
              {profile.avatarUrl ? (
                <Image src={profile.avatarUrl} alt="" fill sizes="80px" className="object-cover" />
              ) : (
                <span className="flex h-full items-center justify-center text-stone-400">
                  <UserRound className="size-9" strokeWidth={1.5} aria-hidden />
                </span>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <h1 className="text-h2 text-stone-900">{profile.fullName}</h1>

              {profile.universityName && (
                <p className="mt-1 flex items-center gap-1.5 text-body text-stone-600">
                  <GraduationCap className="size-4 shrink-0 text-stone-400" aria-hidden />
                  {profile.universityName}
                  {profile.majorName && ` · ${profile.majorName}`}
                </p>
              )}

              {profile.cityName && (
                <p className="mt-1 flex items-center gap-1.5 text-body text-stone-600">
                  <MapPin className="size-4 shrink-0 text-stone-400" aria-hidden />
                  {profile.cityName}
                </p>
              )}

              <div className="mt-3 flex flex-wrap gap-1.5">
                {profile.phoneVerified && <VerifiedBadge kind="phone" />}
                {profile.studentVerified && <VerifiedBadge kind="student" />}
              </div>
            </div>
          </div>

          {profile.bio && (
            <p className="mt-5 whitespace-pre-line border-t border-stone-200/70 pt-5 text-body leading-relaxed text-stone-700">
              {profile.bio}
            </p>
          )}
        </Panel>

        {(facts.length > 0 || profile.budgetMin != null) && (
          <Panel className="p-5 sm:p-6">
            <h2 className="text-h3 text-stone-900">Yaşayış üstünlükləri</h2>
            <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {profile.budgetMin != null && profile.budgetMax != null && (
                <div>
                  <Wallet className="size-4 text-stone-400" aria-hidden />
                  <dt className="mt-1.5 text-2xs uppercase tracking-wider text-stone-500">
                    Büdcə
                  </dt>
                  <dd className="tabular mt-0.5 text-body font-semibold text-stone-900">
                    {formatBudgetRange(profile.budgetMin, profile.budgetMax)}
                  </dd>
                </div>
              )}
              {facts.map((f) => (
                <div key={f.label}>
                  <dt className="text-2xs uppercase tracking-wider text-stone-500">
                    {f.label}
                  </dt>
                  <dd className="mt-0.5 text-body font-semibold text-stone-900">{f.value}</dd>
                </div>
              ))}
            </dl>
          </Panel>
        )}

        {match && (
          <Panel className="p-5 sm:p-6">
            <div className="flex items-center gap-4">
              <MatchRing score={match.score} size="lg" />
              <div className="min-w-0">
                <h2 className="text-h3 text-stone-900">Sizinlə uyğunluq</h2>
                <p className="mt-1 text-sm leading-relaxed text-stone-600">
                  {match.explanation}
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-2.5 border-t border-stone-200/70 pt-5">
              {match.factors.map((f) => (
                <MatchBar
                  key={f.key}
                  label={f.label}
                  score={Math.round(f.similarity * 100)}
                />
              ))}
            </div>
          </Panel>
        )}
      </div>

      <aside className="flex flex-col gap-4 lg:sticky lg:top-20">
        <Panel className="flex flex-col gap-4 p-5">
          {/* `listingId` yoxdur — otaq yoldaşı əlaqəsi uyğunlaşmadan sonra
              qurulur, ona görə düymə burada həmişə söndürülüdür. */}
          <ContactButton
            canReveal={phone !== null}
            message={roommateContactMessage(profile.fullName)}
            signInHint="Əlaqə üçün əvvəlcə uyğunlaşma təklifi göndərin."
          />

          <Well className="flex items-start gap-2.5 border border-warning-100 bg-warning-50">
            <ShieldAlert className="mt-0.5 size-4 shrink-0 text-warning-600" aria-hidden />
            <p className="text-2xs leading-relaxed text-warning-600">
              İlk görüşü ictimai yerdə təyin edin. Şəxsi sənəd və ya pul
              məlumatınızı paylaşmayın.
            </p>
          </Well>

          <ReportButton
            targetType={ReportTarget.USER}
            targetId={userId}
            targetLabel={profile.fullName}
          />
        </Panel>
      </aside>
    </div>
  );
}
