import type { Metadata } from 'next';
import { ListingDetail } from '@/components/listing/listing-detail';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: slug.replace(/-[a-f0-9]{4}$/, '').replace(/-/g, ' '),
    description: 'Tələbələr üçün kirayə elanı — qiymət, otaq məlumatı və ev qaydaları.',
  };
}

export default async function ListingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <ListingDetail slug={slug} />
    </div>
  );
}
