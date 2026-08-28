import type { Metadata } from 'next';
import { RoommateDiscovery } from '@/components/roommate/roommate-discovery';

export const metadata: Metadata = {
  title: 'Otaq yoldaşı tap',
  description:
    'Vərdişlərinə uyğun tələbələri kəşf et. Uyğunluq faizi profil cavablarına görə hesablanır.',
};

export default function RoommatesPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      <RoommateDiscovery />
    </div>
  );
}
