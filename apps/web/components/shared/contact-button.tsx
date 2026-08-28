'use client';

import { useState } from 'react';
import { Copy, Check, MessageCircle, Phone, Send } from 'lucide-react';
import { formatPhone, telLink, whatsAppLink } from '@yasayis/shared';
import { api, ApiRequestError } from '@/lib/api-client';
import { MessageDialog } from '@/components/messages/message-dialog';
import { ButtonLink, Button } from '@/components/ui/button';
import { Well } from '@/components/ui/card';

/**
 * "Əlaqə saxla"
 *
 * İKİ KANAL, BİRİ DİGƏRİNİ ƏVƏZ ETMİR:
 *
 *   · nömrə  — zəng və WhatsApp; ən sürətli yoldur, ona görə əsas düymədir;
 *   · mesaj  — saytdaxili yazışma; nömrə olmayanda YEGANƏ yol, nömrə olanda
 *     isə əlavə seçim kimi altda qalır.
 *
 * Əvvəl bu ikisi bir-birini istisna edirdi: nömrə varsa yalnız nömrə, yoxsa
 * yalnız mesaj göstərilirdi. Amma zəng etmək istəməyən (və ya cavab ala
 * bilməyən) tələbənin yazılı müraciət etmək imkanı qalmırdı.
 *
 * NÖMRƏ SƏHİFƏNİN MƏLUMATINDA GƏLMİR — bu, təhlükəsizlik qərarıdır.
 * Əvvəllər nömrə elan cavabının içində gəlirdi və düymə sadəcə onu gizlədirdi:
 * bir hesab açıb elanları gəzməklə bütün ev sahiblərinin nömrəsini heç bir iz
 * qoymadan yığmaq olurdu. İndi hər açılış ayrıca sorğudur, gündəlik limitə
 * tabedir və `ContactEvent` kimi qeydə düşür.
 *
 * WhatsApp `wa.me` deep-link-idir: mobil-də tətbiqi, desktopda WhatsApp Web-i
 * açır və hazır mesaj mətni ilə gəlir — istifadəçi boş ekrana baxıb nə
 * yazacağını düşünməsin.
 */
export function ContactButton({
  listingId,
  message,
  canReveal,
  signInHint = 'Nömrəni görmək üçün daxil olun.',
  size = 'lg',
  ownerId,
  ownerName,
  ownerHasPhone = true,
}: {
  /**
   * Nömrənin açılacağı elan.
   *
   * Otaq yoldaşı profilində VERİLMİR: orada əlaqə yalnız qarşılıqlı
   * uyğunlaşmadan sonra qurulur və açılacaq elan yoxdur. Bu halda düymə
   * söndürülü qalır və `signInHint` səbəbi izah edir.
   */
  listingId?: string;
  message?: string;
  /** false = qonaqdır və ya sahibi nömrə əlavə etməyib. */
  canReveal: boolean;
  signInHint?: string;
  size?: 'md' | 'lg';
  /** Mesaj yazmaq üçün — nömrə yoxdursa yeganə əlaqə yoludur. */
  ownerId?: string;
  ownerName?: string;
  /** false = sahibi nömrə əlavə etməyib; yalnız mesaj təklif olunur. */
  ownerHasPhone?: boolean;
}) {
  const [phone, setPhone] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [writing, setWriting] = useState(false);

  const canMessage = Boolean(canReveal && listingId && ownerId);

  /** Mesaj seçimi — iki fərqli halda eyni görünür, ona görə bir yerdə. */
  const messageOption = canMessage ? (
    <Button size="sm" variant="tertiary" fullWidth onClick={() => setWriting(true)}>
      <Send className="size-4" aria-hidden />
      Mesaj yaz
    </Button>
  ) : null;

  /*
    Yazışma forması açılanda düymələri ƏVƏZ EDİR.
    Hər ikisini eyni anda göstərmək ekranda iki eyni işi görən element
    yaradardı və istifadəçi hansına baxacağını bilməzdi.
  */
  if (writing && ownerId && listingId) {
    return (
      <MessageDialog
        recipientId={ownerId}
        listingId={listingId}
        recipientName={ownerName ?? 'Elan sahibi'}
        defaultBody={message}
        onClose={() => setWriting(false)}
      />
    );
  }

  // --- Sahibi nömrə əlavə etməyib: yeganə yol mesajdır ---------------------
  if (canMessage && !ownerHasPhone) {
    return (
      <div className="flex flex-col gap-2">
        <Button size={size} fullWidth onClick={() => setWriting(true)}>
          <MessageCircle className="size-5" aria-hidden />
          Mesaj yaz
        </Button>
        <p className="text-center text-2xs text-stone-500">
          Elan sahibi nömrə əlavə etməyib — mesaj göndərə bilərsiniz.
        </p>
      </div>
    );
  }

  // --- Qonaq və ya elan yoxdur ---------------------------------------------
  if (!canReveal || !listingId) {
    return (
      <div className="flex flex-col gap-2">
        <Button size={size} fullWidth disabled>
          <MessageCircle className="size-5" aria-hidden />
          Əlaqə saxla
        </Button>
        <p className="text-center text-2xs text-stone-500">{signInHint}</p>
      </div>
    );
  }

  const reveal = async () => {
    setBusy(true);
    setError(null);

    try {
      const res = await api.post<{ phone: string | null }>(
        `/listings/${listingId}/contact`,
      );
      if (res.phone) {
        setPhone(res.phone);
      } else {
        setError('Ev sahibi hələ nömrə əlavə etməyib.');
      }
    } catch (e) {
      setError(
        e instanceof ApiRequestError && e.status === 429
          ? e.message
          : e instanceof ApiRequestError && (e.status === 401 || e.status === 403)
            ? 'Nömrəni görmək üçün daxil olun.'
            : 'Nömrə açıla bilmədi. Bir azdan yenidən cəhd edin.',
      );
    }
    setBusy(false);
  };

  // --- Nömrə var, hələ açılmayıb: hər iki seçim ----------------------------
  if (!phone) {
    return (
      <div className="flex flex-col gap-2">
        <Button size={size} fullWidth loading={busy} onClick={reveal}>
          <Phone className="size-5" aria-hidden />
          Nömrəni göstər
        </Button>

        {error && (
          <p role="alert" className="text-center text-sm text-danger-600">
            {error}
          </p>
        )}

        {messageOption}

        {canMessage && (
          <p className="text-center text-2xs text-stone-500">
            Zəng etmək istəmirsinizsə, saytdan yaza bilərsiniz.
          </p>
        )}
      </div>
    );
  }

  const wa = whatsAppLink(phone, message);

  const copy = async () => {
    await navigator.clipboard.writeText(phone).catch(() => undefined);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // --- Nömrə açıldı: zəng, WhatsApp və yenə də mesaj -----------------------
  return (
    <div className="flex flex-col gap-2">
      <Well className="flex items-center justify-between gap-3 bg-sprout-50">
        <span className="tabular min-w-0 truncate text-body font-semibold text-forest-700 sm:text-h3">
          {formatPhone(phone)}
        </span>
        <button
          type="button"
          onClick={copy}
          aria-label="Nömrəni kopyala"
          className="grid size-9 shrink-0 place-items-center rounded-[var(--radius-input)] text-forest-600 transition-colors hover:bg-white"
        >
          {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
        </button>
      </Well>

      <div className="grid grid-cols-2 gap-2">
        {wa && (
          <ButtonLink
            href={wa}
            target="_blank"
            rel="noopener noreferrer"
            size="md"
            fullWidth
          >
            <MessageCircle className="size-4" aria-hidden />
            WhatsApp
          </ButtonLink>
        )}
        <ButtonLink href={telLink(phone)} size="md" variant="tertiary" fullWidth>
          <Phone className="size-4" aria-hidden />
          Zəng et
        </ButtonLink>
      </div>

      {messageOption}
    </div>
  );
}
