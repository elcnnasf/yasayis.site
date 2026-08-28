import { notificationLabels, type NotificationType } from '@yasayis/shared';

/**
 * Bildiriş sətrinin oxunaqlı formaya çevrilməsi.
 *
 * Server `payload`-u sərbəst JSON kimi saxlayır (hər bildiriş növünün öz
 * sahələri var). Ekranda göstərmək üçün lazım olan iki şey — bir cümlə və bir
 * keçid — burada bir yerdə çıxarılır ki, zəng menyusu ilə bildiriş səhifəsi
 * eyni mətni göstərsin.
 */

export interface NotificationDto {
  id: string;
  type: NotificationType;
  payload: Record<string, unknown> | null;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationView {
  title: string;
  detail: string | null;
  href: string | null;
}

const str = (p: Record<string, unknown> | null, key: string): string | null => {
  const v = p?.[key];
  return typeof v === 'string' && v.trim() ? v : null;
};

export function viewOf(n: NotificationDto): NotificationView {
  const p = n.payload;
  const title = notificationLabels[n.type] ?? 'Bildiriş';
  const slug = str(p, 'slug');
  const listingHref = slug ? `/elan/${slug}` : null;

  switch (n.type) {
    case 'ELAN_TESDIQLENDI':
    case 'ELAN_YENILENDI':
    case 'ELAN_MUDDETI_BITIR':
      return { title, detail: str(p, 'title'), href: listingHref };

    case 'ELAN_REDD_EDILDI':
      return {
        title,
        detail: str(p, 'reason') ?? str(p, 'title'),
        href: '/profil',
      };

    case 'YENI_UYGUN_ELAN':
      return {
        title,
        detail: [str(p, 'alertName'), str(p, 'title')].filter(Boolean).join(' · ') || null,
        href: listingHref,
      };

    case 'QIYMET_DEYISDI':
      return {
        title,
        detail: [str(p, 'title'), str(p, 'summary')].filter(Boolean).join(' · ') || null,
        href: listingHref,
      };

    case 'YENI_UYGUN_OTAQ_YOLDASI':
      return {
        title,
        detail: str(p, 'fullName'),
        href: '/otaq-yoldasi/uygunlasmalar',
      };

    case 'PROFIL_TESDIQLENDI':
    case 'TELEFON_TESDIQLENDI':
      return { title, detail: str(p, 'note'), href: '/profil' };

    case 'SIKAYET_NETICESI':
      return { title, detail: str(p, 'resolutionNote'), href: null };

    default:
      return { title, detail: str(p, 'message'), href: null };
  }
}

/** "3 saat əvvəl" — bildirişlərdə dəqiq tarixdən daha oxunaqlıdır. */
export function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diff / 60_000);

  if (minutes < 1) return 'indicə';
  if (minutes < 60) return `${minutes} dəq əvvəl`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} saat əvvəl`;

  const days = Math.round(hours / 24);
  if (days < 30) return `${days} gün əvvəl`;

  return new Date(iso).toLocaleDateString('az-AZ', { day: 'numeric', month: 'short' });
}
