'use client';

import { useState } from 'react';
import { Phone, ShieldCheck } from 'lucide-react';
import { formatPhone, type AuthResultDto } from '@yasayis/shared';
import { api } from '@/lib/api-client';
import { PhoneVerify } from '@/components/auth/phone-verify';
import { Button } from '@/components/ui/button';
import { VerifiedBadge } from '@/components/ui/badge';
import { Panel, Well } from '@/components/ui/card';

/**
 * Telefon nömrəsinin təsdiqi.
 *
 * Bu ekran platformada ƏN VACİB açardır və əvvəl heç yerdə yox idi:
 * serverdə qayda var ki, otaq yoldaşı profili telefon təsdiqlənməyənə qədər
 * BAŞQALARINA GÖRÜNMÜR. Təsdiq üçün UI olmadığından yeni istifadəçi otaq
 * yoldaşı axtarışında heç vaxt görünə bilmirdi — funksiya bütövlükdə ölü idi.
 *
 * Təsdiqdən sonra `router.refresh()` deyil, çağıran tərəfin `onVerified`-i
 * işləyir: profil səhifəsi bütün məlumatı bir sorğuda oxuyur və nişanlar,
 * otaq yoldaşı görünürlüyü, hamısı eyni anda yenilənməlidir.
 */
export function PhoneCard({
  phone,
  verified,
  onVerified,
}: {
  phone: string | null;
  verified: boolean;
  onVerified: () => void;
}) {
  const [open, setOpen] = useState(false);

  if (verified && phone && !open) {
    return (
      <Panel className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5">
        <div className="min-w-0 flex-1">
          {/*
            Nomre mobilde `text-h3` ilə cox genis idi və nisan ikinci sətrə
            düşürdü. Mobildə şrift kiçilir, nömrə isə `truncate` ilə tək sətirdə
            qalır; nişan `shrink-0`-dır ki, sıxılanda yox olmasın.
          */}
          <p className="flex min-w-0 items-center gap-2 text-body font-semibold text-stone-900 sm:text-h3">
            <Phone className="hidden size-4 shrink-0 text-stone-400 sm:block" aria-hidden />
            <span className="tabular truncate">{formatPhone(phone)}</span>
            <span className="shrink-0">
              <VerifiedBadge kind="phone" />
            </span>
          </p>
          <p className="mt-1 text-2xs text-stone-600 sm:text-sm">
            Nömrən təsdiqlənib — otaq yoldaşı profilin başqalarına görünə bilər.
          </p>
        </div>

        <Button size="sm" variant="tertiary" onClick={() => setOpen(true)}>
          Nömrəni dəyiş
        </Button>
      </Panel>
    );
  }

  return (
    <Panel className="p-5 sm:p-6">
      <h2 className="flex items-center gap-2 text-h3 text-stone-900">
        <ShieldCheck className="size-4.5 shrink-0 text-forest-600" aria-hidden />
        Telefon nömrəsini təsdiqlə
      </h2>

      {!verified && (
        <Well className="mt-3">
          <p className="text-sm leading-relaxed text-stone-700">
            Otaq yoldaşı profilin təsdiqlənmiş nömrə olmadan başqalarına
            <strong> görünmür</strong>. Ev sahibləri də təsdiqlənmiş nömrəyə daha
            çox etibar edir.
          </p>
        </Well>
      )}

      <div className="mt-4">
        <PhoneVerify
          purpose="PHONE_VERIFY"
          initialPhone={phone ?? undefined}
          submitLabel="Nömrəni təsdiqlə"
          onCancel={open ? () => setOpen(false) : undefined}
          onVerify={async (p, code) => {
            await api.post<AuthResultDto>('/auth/phone/verify', {
              phone: p,
              code,
              purpose: 'PHONE_VERIFY',
            });
            setOpen(false);
            onVerified();
          }}
        />
      </div>
    </Panel>
  );
}
