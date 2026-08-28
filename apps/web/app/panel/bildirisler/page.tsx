import type { Metadata } from 'next';
import { NotificationList } from '@/components/notifications/notification-list';

export const metadata: Metadata = {
  title: 'Bildirişlər',
  description: 'Elanlarının statusu, saxladığın axtarışlar və təsdiq qərarları.',
  robots: { index: false, follow: false },
};

export default function NotificationsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
      <h1 className="text-h1 text-stone-900">Bildirişlər</h1>
      <p className="mt-2 text-body text-stone-600">
        Elanının statusu dəyişəndə, saxladığın axtarışa uyğun ev çıxanda və təsdiq
        qərarı veriləndə burada yazırıq.
      </p>

      <div className="mt-6">
        <NotificationList />
      </div>
    </div>
  );
}
