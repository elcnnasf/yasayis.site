import type { Metadata } from 'next';
import { JointSearch } from '@/components/roommate/joint-search';

export const metadata: Metadata = {
  title: 'Birlikdə ev axtar',
  description: 'Otaq yoldaşınızla birgə büdcə və şərtlərə uyğun elanlar.',
  robots: { index: false, follow: false },
};

export default async function JointSearchPage({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  const { matchId } = await params;
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <JointSearch matchId={matchId} />
    </div>
  );
}
