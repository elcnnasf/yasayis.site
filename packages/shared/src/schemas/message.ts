/**
 * Daxili mesajlaşma.
 *
 * NİYƏ VAR — MVP "mürəkkəb daxili chat"i istisna edir
 * Bu, chat deyil: real vaxt kanalı, yazır göstəricisi, qrup söhbəti və fayl
 * göndərmə yoxdur. Bu, ELANA BAĞLI SADƏ YAZIŞMADIR və konkret boşluğu bağlayır:
 * elan sahibi telefon nömrəsi əlavə etməyibsə, tələbənin onunla əlaqə saxlamaq
 * üçün heç bir yolu qalmırdı — "Əlaqə saxla" düyməsi söndürülü dayanırdı.
 *
 * `Message` cədvəli bazada əvvəldən var idi, amma onu oxuyan-yazan heç bir
 * endpoint yox idi.
 */

import { z } from 'zod';
import { idSchema } from './common';

export const MESSAGE = {
  BODY_MIN: 1,
  /** Bazadakı `VarChar(2000)` ilə eyni. */
  BODY_MAX: 2000,
} as const;

export const sendMessageSchema = z.object({
  recipientId: idSchema,
  /** Yazışma hansı elana aiddir — söhbət başlığında göstərilir. */
  listingId: idSchema.nullish(),
  body: z
    .string()
    .trim()
    .min(MESSAGE.BODY_MIN, 'Mesaj boş ola bilməz')
    .max(MESSAGE.BODY_MAX, 'Mesaj çox uzundur'),
});
export type SendMessageInput = z.infer<typeof sendMessageSchema>;

// ---------------------------------------------------------------------------
// Cavab tipləri
// ---------------------------------------------------------------------------

export interface MessageDto {
  id: string;
  body: string;
  /** true = mesajı bu istifadəçi göndərib. */
  mine: boolean;
  readAt: string | null;
  createdAt: string;
}

/** Söhbət başlığı — siyahıda bir sətir. */
export interface MessageThreadDto {
  /** Qarşı tərəf. Söhbət cütlük + elan üzrə qruplaşdırılır. */
  partner: {
    userId: string;
    fullName: string;
    avatarUrl: string | null;
  };
  listing: { id: string; slug: string; title: string } | null;
  lastMessage: { body: string; mine: boolean; createdAt: string };
  unreadCount: number;
}

export interface MessageThreadDetailDto {
  partner: MessageThreadDto['partner'];
  listing: MessageThreadDto['listing'];
  items: MessageDto[];
}
