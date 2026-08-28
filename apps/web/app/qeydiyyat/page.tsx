import type { Metadata } from 'next';
import { AuthShell, AuthSwitch } from '@/components/auth/auth-shell';
import { RegisterForm } from '@/components/auth/register-form';

export const metadata: Metadata = {
  title: 'Qeydiyyat',
  description:
    'Yasayis-də hesab yarat — tələbələr üçün ev, otaq və otaq yoldaşı axtarışı.',
  robots: { index: true, follow: true },
};

export default function RegisterPage() {
  return (
    <AuthShell
      title="Hesab yarat."
      subtitle="Bir neçə dəqiqə çəkir. Universitet və büdcəni növbəti addımda soruşacağıq."
      footer={<AuthSwitch href="/giris" prompt="Artıq hesabın var?" action="Daxil ol" />}
    >
      <RegisterForm />
    </AuthShell>
  );
}
