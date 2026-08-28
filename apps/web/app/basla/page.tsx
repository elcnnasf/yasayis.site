import type { Metadata } from 'next';
import { OnboardingFlow } from '@/components/onboarding/onboarding-flow';

export const metadata: Metadata = {
  title: 'Profilini qur',
  description:
    'Bir neçə sualla profilini tamamla — uyğun ev, otaq və otaq yoldaşı təklifləri buna görə hesablanır.',
  robots: { index: false, follow: false },
};

/** Qeydiyyatdan sonra istifadəçi bura yönləndirilir (Prompt C1). */
export default function OnboardingPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
      <OnboardingFlow />
    </div>
  );
}
