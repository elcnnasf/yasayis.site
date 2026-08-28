import type { Metadata } from 'next';
import { ProfileView } from '@/components/profile/profile-view';

export const metadata: Metadata = {
  title: 'Profilim',
  description: 'Profil məlumatların, sahələrin görünürlüyü və elanların.',
  robots: { index: false, follow: false },
};

export default function ProfilePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <ProfileView />
    </div>
  );
}
