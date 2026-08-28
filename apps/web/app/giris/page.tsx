import { Suspense } from 'react';
import type { Metadata } from 'next';
import { AuthShell, AuthSwitch } from '@/components/auth/auth-shell';
import { LoginForm } from '@/components/auth/login-form';
import { Skeleton } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'Daxil ol',
  description: 'Yasayis hesabına daxil ol və axtarışına davam et.',
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <AuthShell
      title="Yenidən xoş gəldin."
      subtitle="Saxladığın elanlara və otaq yoldaşı təkliflərinə davam et."
      footer={<AuthSwitch href="/qeydiyyat" prompt="Hesabın yoxdur?" action="Qeydiyyatdan keç" />}
    >
      {/* `useSearchParams` Suspense sərhədi tələb edir — onsuz bütün səhifə
          client-side render-ə düşür və statik hissə də itir. */}
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
