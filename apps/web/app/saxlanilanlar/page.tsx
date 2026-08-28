import type { Metadata } from 'next';
import { SavedItems } from '@/components/favorites/saved-items';

export const metadata: Metadata = {
  title: 'Saxlanılanlar',
  description: 'Bəyəndiyiniz elanlar və otaq yoldaşı profilləri.',
  robots: { index: false, follow: false },
};

export default function SavedPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      <h1 className="mb-5 text-h1 text-stone-900">Saxlanılanlar</h1>
      <SavedItems />
    </div>
  );
}
