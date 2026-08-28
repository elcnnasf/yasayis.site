'use client';

import { useEffect, useState } from 'react';
import type { SessionUserDto } from '@yasayis/shared';
import { api, ApiRequestError } from '@/lib/api-client';
import { Skeleton } from '@/components/ui/card';
import { GuestHome } from './guest-home';
import { UserDashboard } from './user-dashboard';

/**
 * Ana səhifə iki görünüşdən birini göstərir.
 *
 * Sessiya client-də yoxlanılır, çünki cavab istifadəçiyə görə dəyişir və
 * səhifə statik olaraq əvvəlcədən yaradıla bilməz. Qonaq görünüşü SEO üçün
 * vacibdir, ona görə yükləmə anında da onun skeleti göstərilir — boş ekran yox.
 */
export function HomeView() {
  const [user, setUser] = useState<SessionUserDto | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;

    api
      .get<SessionUserDto>('/auth/me')
      .then((res) => {
        if (!cancelled) setUser(res);
      })
      .catch((e: unknown) => {
        // 401 gözlənilən haldır — qonaqdır.
        if (!cancelled && !(e instanceof ApiRequestError && e.status === 401)) {
          setUser(null);
        }
      })
      .finally(() => {
        if (!cancelled) setChecked(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (!checked) {
    // Skelet TÜND fondadır, çünki hər iki görünüşün yuxarısı tünddür.
    // Açıq skelet göstərmək səhifə açılanda ağ→tünd sıçrayışı yaradır və
    // bu, yükləmənin özündən daha çox nəzərə çarpır.
    return (
      <div className="ink">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <Skeleton className="h-12 w-2/3 max-w-lg bg-white/10" />
          <Skeleton className="mt-4 h-6 w-1/2 max-w-sm bg-white/10" />
          <Skeleton className="mt-8 h-13 w-full max-w-xs bg-white/10" />
        </div>
      </div>
    );
  }

  return user ? <UserDashboard user={user} /> : <GuestHome />;
}
