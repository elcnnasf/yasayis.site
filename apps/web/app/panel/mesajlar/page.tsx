import type { Metadata } from 'next';
import { MessagesView } from '@/components/messages/messages-view';

export const metadata: Metadata = {
  title: 'Mesajlar',
  description: 'Elan sahibləri və tələbələrlə yazışmaların.',
  robots: { index: false, follow: false },
};

export default function MessagesPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <h1 className="text-h1 text-stone-900">Mesajlar</h1>
      <p className="mt-2 text-body text-stone-600">
        Elan barədə yazışmalar burada toplanır. Hər elan üçün ayrıca söhbət açılır.
      </p>

      <div className="mt-6">
        <MessagesView />
      </div>
    </div>
  );
}
