import type { Metadata } from 'next';
import { AdminPanel } from '@/components/admin/admin-panel';

export const metadata: Metadata = {
  title: 'Admin panel',
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      <AdminPanel />
    </div>
  );
}
