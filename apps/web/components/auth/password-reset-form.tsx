'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2 } from 'lucide-react';
import { api } from '@/lib/api-client';
import { useCapabilities } from '@/lib/capabilities';
import { ButtonLink } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/field';
import { PhoneVerify } from './phone-verify';

/**
 * Parolun telefon + SMS kodu ilə sıfırlanması.
 *
 * Yeni parol kod addımında birlikdə soruşulur: kod 5 dəqiqəlikdir və ayrıca
 * üçüncü ekran əlavə etmək onun bitmə ehtimalını artırır.
 *
 * Sıfırlamadan sonra server bütün sessiyaları ləğv edir, ona görə istifadəçi
 * avtomatik daxil olmur — girişə yönləndirilir.
 */
export function PasswordResetForm() {
  const router = useRouter();
  const caps = useCapabilities();
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [done, setDone] = useState(false);

  /*
    Parol sıfırlama SMS koduna əsaslanır. Telefon sönülüdürsə səhifə formanı
    göstərmir: istifadəçi nömrəsini yazıb "kod göndər" basar və yalnız o zaman
    xəta alardı.
  */
  if (caps && !caps.phoneAuth) {
    return (
      <div className="flex flex-col gap-4 text-center">
        <p className="text-body leading-relaxed text-stone-700">
          Parolun bərpası hazırda SMS ilə işləyir və bu funksiya müvəqqəti
          söndürülüb. Kömək üçün bizə yazın — hesabınızı əl ilə bərpa edək.
        </p>
        <ButtonLink href="/elaqe" fullWidth>
          Bizə yazın
        </ButtonLink>
        <ButtonLink href="/giris" variant="tertiary" fullWidth>
          Girişə qayıt
        </ButtonLink>
      </div>
    );
  }

  if (done) {
    return (
      <div className="flex flex-col items-center gap-4 py-4 text-center">
        <CheckCircle2 className="size-10 text-forest-600" aria-hidden />
        <p className="text-body text-stone-700">
          Parol dəyişdirildi. Təhlükəsizlik üçün bütün cihazlardan çıxış edildi.
        </p>
        <ButtonLink href="/giris" fullWidth>
          Yeni parolla daxil ol
        </ButtonLink>
      </div>
    );
  }

  return (
    <PhoneVerify
      purpose="PASSWORD_RESET"
      submitLabel="Parolu dəyiş"
      onCancel={() => router.push('/giris')}
      extraFields={
        <>
          <Field label="Yeni parol" required hint="Ən azı 8 simvol, bir hərf və bir rəqəm">
            {(p) => (
              <Input
                {...p}
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
              />
            )}
          </Field>
          <Field label="Yeni parolu təkrarla" required>
            {(p) => (
              <Input
                {...p}
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
              />
            )}
          </Field>
        </>
      }
      onVerify={async (phone, code) => {
        await api.post('/auth/password/reset', {
          phone,
          code,
          newPassword,
          newPasswordConfirm: confirm,
        });
        setDone(true);
      }}
    />
  );
}
