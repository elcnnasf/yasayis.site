'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';

/**
 * Serverin hansı giriş yollarını dəstəklədiyi.
 *
 * Konfiqurasiya API tərəfdədir (SMS provayderi, Google açarları), web isə onu
 * oxuya bilmir — ona görə açıq şəkildə soruşur.
 *
 * NİYƏ LAZIMDIR
 * Provayder qurulmayanda telefonla bağlı düymələr ekranda qalsaydı, istifadəçi
 * onlara basıb xəta alardı və səbəbini başa düşməzdi. İşləməyən düyməni
 * göstərməmək ondan xəta almaqdan yaxşıdır.
 *
 * Yüklənənə qədər `null` qaytarılır — komponentlər bu müddətdə telefonla bağlı
 * hissəni GÖSTƏRMİR. Əks halda düymə görünüb sonra yox olardı və ekran
 * "atılardı".
 */
export interface Capabilities {
  /** Telefonla giriş, nömrə təsdiqi və parol sıfırlama. */
  phoneAuth: boolean;
  google: boolean;
}

export function useCapabilities(): Capabilities | null {
  const [caps, setCaps] = useState<Capabilities | null>(null);

  useEffect(() => {
    let cancelled = false;

    api
      .get<Capabilities>('/auth/capabilities')
      .then((c) => {
        if (!cancelled) setCaps(c);
      })
      .catch(() => {
        // Sorğu alınmadısa ən ehtiyatlı fərziyyə: telefon yoxdur.
        if (!cancelled) setCaps({ phoneAuth: false, google: false });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return caps;
}
