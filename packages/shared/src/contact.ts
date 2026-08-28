/**
 * Əlaqə vasitələri  (PROMPT F2)
 *
 * MVP-də daxili chat YOXDUR. "Əlaqə saxla" düyməsi ya telefon nömrəsini açır,
 * ya da birbaşa WhatsApp söhbətini başladır.
 *
 * `Message` cədvəli bazada mövcuddur, amma UI-da işlədilmir — gələcəkdə daxili
 * mesajlaşma əlavə ediləndə sxem yenidən qurulmasın deyə.
 */

const AZ_COUNTRY_CODE = '994';

/** "+994 50 123 45 67" və ya "0501234567" → "994501234567" */
export function toWhatsAppNumber(phone: string): string | null {
  const digits = phone.replace(/\D/g, '');
  if (!digits) return null;

  // Yerli format: 0501234567 → 994501234567
  if (digits.startsWith('0') && digits.length === 10) {
    return `${AZ_COUNTRY_CODE}${digits.slice(1)}`;
  }
  if (digits.startsWith(AZ_COUNTRY_CODE) && digits.length === 12) return digits;
  // Başqa ölkə kodu ola bilər — olduğu kimi qaytarılır.
  return digits.length >= 10 ? digits : null;
}

/**
 * wa.me deep-link.
 * Mobil-də tətbiqi, desktopda WhatsApp Web-i açır.
 */
export function whatsAppLink(phone: string, message?: string): string | null {
  const number = toWhatsAppNumber(phone);
  if (!number) return null;
  const text = message ? `?text=${encodeURIComponent(message)}` : '';
  return `https://wa.me/${number}${text}`;
}

export function telLink(phone: string): string {
  return `tel:${phone.replace(/\s/g, '')}`;
}

/** Elan üçün hazır mesaj — istifadəçi boş ekrana baxıb nə yazacağını düşünməsin. */
export function listingContactMessage(title: string, url: string): string {
  return `Salam! Yaşayış saytında "${title}" elanınızı gördüm. Hələ aktualdırmı?\n${url}`;
}

/** Otaq yoldaşı üçün hazır mesaj. */
export function roommateContactMessage(fullName: string): string {
  const firstName = fullName.split(' ')[0] ?? fullName;
  return `Salam, ${firstName}! Yaşayış saytında profilinizi gördüm — otaq yoldaşı axtarışı barədə danışa bilərikmi?`;
}
