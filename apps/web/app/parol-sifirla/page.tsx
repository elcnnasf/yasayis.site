import type { Metadata } from 'next';
import { AuthShell, AuthSwitch } from '@/components/auth/auth-shell';
import { PasswordResetForm } from '@/components/auth/password-reset-form';

export const metadata: Metadata = {
  title: 'Parolu sıfırla',
  description: 'Telefon nömrənə göndərilən kod ilə yeni parol təyin et.',
  robots: { index: false, follow: false },
};

export default function PasswordResetPage() {
  return (
    <AuthShell
      title="Parolu sıfırla."
      subtitle="Hesabına bağlı nömrəyə kod göndəririk, sonra yeni parol təyin edirsən."
      footer={<AuthSwitch href="/giris" prompt="Parolun yadına düşdü?" action="Daxil ol" />}
    >
      <PasswordResetForm />
    </AuthShell>
  );
}
