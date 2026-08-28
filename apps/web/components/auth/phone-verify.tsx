'use client';

import { useState } from 'react';
import { ArrowLeft, Phone, ShieldCheck } from 'lucide-react';
import { AUTH } from '@yasayis/shared';
import { api, messageOf } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/field';

/**
 * Telefon nömrəsinin OTP ilə təsdiqi — iki addım.
 *
 * Bu axın platformada TƏK deyil, ÜÇ yerdə lazımdır (nömrə təsdiqi, parolsuz
 * giriş, parol sıfırlama) və hər üçündə eyni işi görür: nömrə al → kod göndər →
 * kodu yoxla. Ona görə addımların idarəsi burada bir dəfə yazılıb, son
 * əməliyyat isə `onVerify` ilə çağıran tərəfə verilir.
 *
 * Niyə vacibdir: otaq yoldaşı profili telefon təsdiqlənməyənə qədər
 * BAŞQALARINA GÖRÜNMÜR (serverdəki qayda). Bu ekran olmadan istifadəçi heç vaxt
 * otaq yoldaşı axtarışında görünə bilmirdi.
 */

export type OtpPurpose = 'PHONE_VERIFY' | 'LOGIN' | 'PASSWORD_RESET';

interface OtpRequestResult {
  message: string;
  /** Yalnız dev + `SMS_PROVIDER="console"` halında gəlir. */
  devCode?: string;
}

export interface PhoneVerifyProps {
  purpose: OtpPurpose;
  /** Nömrə əvvəlcədən məlumdursa (profil), sahə doldurulmuş açılır. */
  initialPhone?: string;
  /** Kod düzgün olanda çağırılır. Xəta atsa, mesaj kod addımında göstərilir. */
  onVerify: (phone: string, code: string) => Promise<void>;
  submitLabel?: string;
  /** Kod addımının altında əlavə sahələr (parol sıfırlamada yeni parol). */
  extraFields?: React.ReactNode;
  onCancel?: () => void;
}

export function PhoneVerify({
  purpose,
  initialPhone,
  onVerify,
  submitLabel = 'Təsdiqlə',
  extraFields,
  onCancel,
}: PhoneVerifyProps) {
  const [phone, setPhone] = useState(initialPhone ?? '+994');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [devCode, setDevCode] = useState<string | null>(null);

  const requestCode = async () => {
    setBusy(true);
    setError(null);
    setNotice(null);
    setDevCode(null);

    try {
      const res = await api.post<OtpRequestResult>('/auth/otp/request', {
        phone: phone.trim(),
        purpose,
      });
      setSent(true);
      setCode('');

      /*
        `devCode` yalnız dev mühitində və `SMS_PROVIDER="console"` olanda gəlir
        (bax: `auth.controller.ts`). Real SMS provayderi qoşulan kimi bu sahə
        cavabda ümumiyyətlə olmur və ekranda heç nə görünmür.
      */
      if (res.devCode) {
        setDevCode(res.devCode);
        setCode(res.devCode);
        setNotice(null);
      } else {
        setNotice(`Kod ${phone.trim()} nömrəsinə göndərildi.`);
      }
    } catch (e) {
      setError(messageOf(e, 'Kod göndərilmədi. Nömrəni yoxlayıb yenidən cəhd edin.'));
    }

    setBusy(false);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      await onVerify(phone.trim(), code.trim());
    } catch (e) {
      setError(messageOf(e, 'Təsdiq alınmadı. Bir azdan yenidən cəhd edin.'));
      setBusy(false);
      return;
    }

    setBusy(false);
  };

  if (!sent) {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void requestCode();
        }}
        className="flex flex-col gap-4"
        noValidate
      >
        {error && <Alert>{error}</Alert>}

        <Field label="Telefon nömrəsi" required hint="+994XXXXXXXXX formatında">
          {(p) => (
            <Input
              {...p}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+994501234567"
            />
          )}
        </Field>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button type="submit" loading={busy} fullWidth>
            <Phone className="size-4" aria-hidden />
            Kod göndər
          </Button>
          {onCancel && (
            <Button type="button" variant="tertiary" onClick={onCancel} fullWidth>
              İmtina
            </Button>
          )}
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      {error && <Alert>{error}</Alert>}
      {notice && !error && (
        <p className="rounded-[var(--radius-input)] bg-sprout-50 px-3.5 py-2.5 text-sm text-forest-700 ring-1 ring-sprout-200">
          {notice}
        </p>
      )}

      {devCode && !error && (
        <p className="rounded-[var(--radius-input)] bg-warning-50 px-3.5 py-2.5 text-sm text-warning-600 ring-1 ring-warning-100">
          <strong>Test rejimi</strong> — real SMS provayderi qoşulmayıb, ona görə
          nömrəyə mesaj getmir. Kod: <strong className="tabular">{devCode}</strong>{' '}
          (sahəyə avtomatik yazıldı).
        </p>
      )}

      <Field label="SMS kodu" required hint={`${AUTH.OTP_LENGTH} rəqəm`}>
        {(p) => (
          <Input
            {...p}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={AUTH.OTP_LENGTH}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            placeholder="000000"
          />
        )}
      </Field>

      {extraFields}

      <Button
        type="submit"
        loading={busy}
        fullWidth
        disabled={code.length !== AUTH.OTP_LENGTH}
      >
        <ShieldCheck className="size-4" aria-hidden />
        {submitLabel}
      </Button>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => {
            setSent(false);
            setError(null);
            setNotice(null);
          }}
          className="inline-flex items-center gap-1 text-sm font-medium text-stone-600 hover:text-forest-700"
        >
          <ArrowLeft className="size-3.5" aria-hidden />
          Nömrəni dəyiş
        </button>

        <button
          type="button"
          disabled={busy}
          onClick={() => void requestCode()}
          className="text-sm font-medium text-forest-700 hover:underline disabled:text-stone-400"
        >
          Kodu yenidən göndər
        </button>
      </div>
    </form>
  );
}

function Alert({ children }: { children: React.ReactNode }) {
  return (
    <p
      role="alert"
      className="rounded-[var(--radius-input)] bg-danger-50 px-3.5 py-2.5 text-sm text-danger-600 ring-1 ring-danger-100"
    >
      {children}
    </p>
  );
}
