import type { Metadata } from 'next';
import { ListingForm } from '@/components/listing/listing-form';

export const metadata: Metadata = {
  title: 'Elan yerləşdir',
  description: 'Evini və ya otağını tələbələrə kirayə ver.',
  robots: { index: false, follow: false },
};

export default function NewListingPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <header className="mb-6">
        <h1 className="text-h1 text-stone-900">Elan yerləşdir</h1>
        <p className="mt-2 text-lead text-stone-600">
          Üç bölməni doldurun və şəkil əlavə edin. Elan dərhal dərc olunur və
          axtarışda görünəcək.
        </p>
      </header>
      <ListingForm />
    </div>
  );
}
