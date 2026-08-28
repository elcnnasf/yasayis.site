import { Suspense } from 'react';
import type { Metadata } from 'next';
import { AuthShell, AuthSwitch } from '@/components/auth/auth-shell';
import { GoogleCallback } from '@/components/auth/google-callback';
import { Skeleton } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'Google ilə giriş',
  robots: { index: false, follow: false },
};

/** Google buraya `?code=` və `?state=` ilə qaytarır. */
export default function GoogleCallbackPage() {
  return (
    <AuthShell
      title="Giriş tamamlanır…"
      subtitle="Google hesabın yoxlanılır, bir neçə saniyə çəkəcək."
      footer={<AuthSwitch href="/giris" prompt="Problem yarandı?" action="Başqa yolla daxil ol" />}
    >
      <Suspense fallback={<Skeleton className="h-24 w-full" />}>
        <GoogleCallback />
      </Suspense>
    </AuthShell>
  );
}
