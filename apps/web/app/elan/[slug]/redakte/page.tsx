import type { Metadata } from 'next';
import { ListingEditor } from '@/components/listing/listing-editor';

export const metadata: Metadata = {
  title: 'Elanı redaktə et',
  robots: { index: false, follow: false },
};

export default async function EditListingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
      <h1 className="text-h1 text-stone-900">Elanı redaktə et</h1>
      <p className="mt-2 text-body text-stone-600">
        Dəyişikliklər dərhal qüvvəyə minir — elan axtarışdan çıxmır.
      </p>

      <div className="mt-6">
        <ListingEditor slug={slug} />
      </div>
    </div>
  );
}
