import type { Metadata } from 'next';
import { RoommateProfile } from '@/components/roommate/roommate-profile';

export const metadata: Metadata = {
  title: 'Otaq yoldaşı profili',
  description: 'Tələbənin yaşayış üstünlükləri və sizinlə uyğunluğu.',
};

export default async function RoommateProfilePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <RoommateProfile userId={userId} />
    </div>
  );
}
