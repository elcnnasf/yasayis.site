'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { SessionUserDto } from '@yasayis/shared';
import { api } from '@/lib/api-client';
import { Skeleton } from '@/components/ui/card';
import { AdminDashboard } from './admin-dashboard';
import {
  AdminAudit,
  AdminListings,
  AdminReports,
  AdminTabs,
  AdminUsers,
} from './admin-tables';
import { AdminTaxonomy } from './admin-taxonomy';

type Tab =
  | 'dashboard'
  | 'listings'
  | 'users'
  | 'reports'
  | 'taxonomy'
  | 'audit';

const TABS: { id: Tab; label: string }[] = [
  { id: 'dashboard', label: 'Göstəricilər' },
  { id: 'listings', label: 'Elanlar' },
  { id: 'users', label: 'İstifadəçilər' },
  { id: 'reports', label: 'Şikayətlər' },
  { id: 'taxonomy', label: 'Taksonomiya' },
  { id: 'audit', label: 'Audit jurnalı' },
];

/**
 * Admin panel.
 *
 * Bölmələr tab-lardadır: admin işi bir bölmədən digərinə tez-tez keçir
 * (şikayətə baxıb elana keçmək kimi), ayrı səhifələr hər dəfə yenidən
 * yükləmə tələb edərdi.
 *
 * GİRİŞ YOXLAMASI burada da var, halbuki əsas müdafiə serverdədir (hər admin
 * endpoint-i `@RequireAbility` ilə qorunur və data heç vaxt sızmır). Bu
 * yoxlama məlumatı qorumur — İNTERFEYSİ qorur.
 *
 * Admin olmayan istifadəçi "bu bölmə adminlər üçündür" ekranını GÖRMÜR, birbaşa
 * ANA SƏHİFƏYƏ atılır. Səbəb: izahlı ekran `/admin` ünvanının doğrudan mövcud
 * olduğunu təsdiqləyir və panelin varlığını reklam edir. Yönləndirmə isə heç
 * nə demir — ünvanı təsadüfən yazan adam sadəcə ana səhifədə tapılır.
 *
 * Bu, təhlükəsizlik sərhədi DEYİL (client kodu həmişə oxuna bilər) — sərhəd
 * serverdədir. Bu, sadəcə görünürlüyü azaldır.
 */
export function AdminPanel() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('dashboard');
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;

    const bounce = () => {
      if (cancelled) return;
      setAllowed(false);
      // `replace`, `push` deyil: brauzerin geri düyməsi istifadəçini yenidən
      // `/admin`-ə qaytarıb sonsuz dövrəyə salmasın.
      router.replace('/');
    };

    api
      .get<SessionUserDto>('/auth/me')
      .then((user) => {
        if (cancelled) return;
        if (!user.isAdmin) {
          bounce();
          return;
        }
        setAllowed(true);
      })
      .catch(bounce);

    return () => {
      cancelled = true;
    };
  }, [router]);

  // Yönləndirmə gedənə qədər skelet qalır — admin paneli bir an da görünmür.
  if (allowed === null || allowed === false) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-11 w-full max-w-lg" />
        <Skeleton className="h-64 w-full rounded-[var(--radius-panel)]" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <AdminTabs tabs={TABS} active={tab} onChange={setTab} />

      {tab === 'dashboard' && <AdminDashboard />}
      {tab === 'listings' && <AdminListings />}
      {tab === 'users' && <AdminUsers />}
      {tab === 'reports' && <AdminReports />}
      {tab === 'taxonomy' && <AdminTaxonomy />}
      {tab === 'audit' && <AdminAudit />}
    </div>
  );
}
