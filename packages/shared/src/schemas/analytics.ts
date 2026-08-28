/**
 * Ölçmə hadisələri.
 *
 * Yalnız hunini qurmaq üçün lazım olan minimum qeyd olunur — davranış izləmə
 * və ya reklam məqsədi yoxdur.
 */

import { z } from 'zod';
import { idSchema } from './common';

export const CONTACT_CHANNELS = {
  PHONE_REVEAL: 'PHONE_REVEAL',
  WHATSAPP: 'WHATSAPP',
  CALL: 'CALL',
} as const;
export type ContactChannel = (typeof CONTACT_CHANNELS)[keyof typeof CONTACT_CHANNELS];

/**
 * Əlaqə təşəbbüsü.
 *
 * Nömrə açılanda yazılır. Eyni hədəf üçün təkrar qeyd yaranmır — hunini
 * şişirtməsin deyə (unikal indeks: initiator + target + listing).
 */
export const recordContactSchema = z.object({
  targetUserId: idSchema,
  listingId: idSchema.optional(),
  channel: z.enum([
    CONTACT_CHANNELS.PHONE_REVEAL,
    CONTACT_CHANNELS.WHATSAPP,
    CONTACT_CHANNELS.CALL,
  ]),
});
export type RecordContactInput = z.infer<typeof recordContactSchema>;
