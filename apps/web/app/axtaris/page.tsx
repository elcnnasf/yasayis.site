import { Suspense } from 'react';
import type { Metadata } from 'next';
import { SearchResults } from '@/components/search/search-results';

export const metadata: Metadata = {
  title: 'Axtarış',
  description: 'Şəhər, rayon, universitet, qiymət və ev xüsusiyyətlərinə görə elan axtar.',
};

export default function SearchPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      {/* useSearchParams client komponentdə işlədiyi üçün Suspense sərhədi lazımdır. */}
      <Suspense fallback={null}>
        <SearchResults />
      </Suspense>
    </div>
  );
}
