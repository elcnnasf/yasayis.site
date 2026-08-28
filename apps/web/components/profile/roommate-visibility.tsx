'use client';

import { useEffect, useState } from 'react';
import { Users } from 'lucide-react';
import { api, messageOf } from '@/lib/api-client';
import { PrivacyToggle } from '@/components/onboarding/privacy-toggle';
import { Panel, Skeleton, Well } from '@/components/ui/card';

interface RoommateProfileDto {
  active: boolean;
  visible: boolean;
}

/**
 * Otaq yoldaşı axtarışında görünürlük.
 *
 * `PATCH /me/roommate-profile` əvvəldən var idi, amma heç bir ekrandan
 * çağırılmırdı: istifadəçi nə görünə, nə də gizlənə bilirdi. İkisi ayrı
 * açardır və qəsdən:
 *
 *   active  — "otaq yoldaşı axtarıram" (axtarışı dayandırmadan gizlənmək olur)
 *   visible — "profilim başqalarına göstərilsin"
 *
 * `visible` telefon təsdiqindən ASILIDIR. Bu qayda serverdə məcburidir, burada
 * yalnız səbəbi izah olunur — istifadəçi açarın niyə işləmədiyini tapmasın.
 */
export function RoommateVisibility({ phoneVerified }: { phoneVerified: boolean }) {
  const [profile, setProfile] = useState<RoommateProfileDto | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    api
      .get<RoommateProfileDto>('/me/roommate-profile')
      .then((r) => {
        if (!cancelled) setProfile({ active: r.active, visible: r.visible });
      })
      .catch(() => {
        if (!cancelled) setProfile(null);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (!profile) return <Skeleton className="h-32 w-full rounded-[var(--radius-panel)]" />;

  const save = async (next: RoommateProfileDto) => {
    const previous = profile;
    setProfile(next);
    setBusy(true);
    setError(null);

    try {
      await api.patch('/me/roommate-profile', next);
    } catch (e) {
      setProfile(previous);
      setError(messageOf(e, 'Dəyişiklik saxlanılmadı. Bir azdan yenidən cəhd edin.'));
    }

    setBusy(false);
  };

  return (
    <Panel className="p-5 sm:p-6">
      <h2 className="flex items-center gap-2 text-h3 text-stone-900">
        <Users className="size-4.5 shrink-0 text-forest-600" aria-hidden />
        Otaq yoldaşı axtarışı
      </h2>

      {error && (
        <p role="alert" className="mt-3 text-sm text-danger-600">
          {error}
        </p>
      )}

      <div className="mt-4 flex flex-col gap-2.5">
        <PrivacyToggle
          checked={profile.active}
          onChange={(v) => void save({ active: v, visible: v ? profile.visible : false })}
          publicLabel="Otaq yoldaşı axtarıram"
          privateLabel="Hazırda axtarmıram"
          note="Bağlı olanda sənə yeni təklif gəlmir və profilin siyahılarda çıxmır."
        />

        <PrivacyToggle
          checked={profile.visible}
          onChange={(v) => void save({ ...profile, visible: v })}
          publicLabel="Profilim başqalarına görünür"
          privateLabel="Profilim gizlidir"
          note={
            phoneVerified
              ? 'Yalnız giriş etmiş tələbələr profilini görə bilir.'
              : 'Görünmək üçün əvvəlcə telefon nömrəni təsdiqlə.'
          }
        />
      </div>

      {!phoneVerified && (
        <Well className="mt-3">
          <p className="text-sm leading-relaxed text-stone-700">
            Telefon nömrən təsdiqlənməyib, ona görə profilin otaq yoldaşı
            axtarışında <strong>görünmür</strong>. Yuxarıdakı bölmədən nömrəni
            təsdiqlə — açar dərhal işə düşəcək.
          </p>
        </Well>
      )}

      <span className="sr-only" aria-live="polite">
        {busy ? 'Saxlanılır' : ''}
      </span>
    </Panel>
  );
}
