import type { Metadata } from 'next';
import { MatchList } from '@/components/roommate/match-list';

export const metadata: Metadata = {
  title: 'Uyğunlaşmalar',
  description: 'Otaq yoldaşı təkliflərin və qəbul edilmiş uyğunlaşmaların.',
  robots: { index: false, follow: false },
};

export default function MatchesPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <h1 className="text-h1 text-stone-900">Uyğunlaşmalar</h1>
      <p className="mt-2 max-w-xl text-body leading-relaxed text-stone-600">
        Sənə gələn təkliflər, qəbul etdiklərin və göndərdiklərin — hamısı burada.
      </p>

      <div className="mt-8">
        <MatchList />
      </div>
    </div>
  );
}
