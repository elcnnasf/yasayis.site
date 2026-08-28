import type { Metadata } from 'next';
import { SearchAlerts } from '@/components/alerts/search-alerts';

export const metadata: Metadata = {
  title: 'Axtarış bildirişləri',
  description: 'Saxladığın axtarışlar — uyğun elan yerləşəndə xəbər veririk.',
  robots: { index: false, follow: false },
};

export default function SearchAlertsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <h1 className="text-h1 text-stone-900">Axtarış bildirişləri</h1>
      <p className="mt-2 max-w-xl text-body leading-relaxed text-stone-600">
        Saxladığın filtrlərə uyğun yeni elan yerləşəndə sənə bildiriş göndəririk.
      </p>

      <div className="mt-6">
        <SearchAlerts />
      </div>
    </div>
  );
}
