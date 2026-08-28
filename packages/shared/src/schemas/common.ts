/**
 * Ortaq Zod sxemləri.
 *
 * Eyni sxem həm API DTO validasiyası, həm də web formlarının validasiyası üçün
 * işlənir. Client validasiya yalnız UX üçündür — təhlükəsizlik həmişə server
 * tərəfdə, bu sxemlərlə təmin olunur.
 */

import { z } from 'zod';
import { AUTH, PAGINATION, PHONE_REGEX, PRICE } from '../constants';

export const idSchema = z.string().cuid({ message: 'Yanlış identifikator' });

export const slugSchema = z
  .string()
  .min(3, 'Çox qısadır')
  .max(160, 'Çox uzundur')
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Yanlış format');

export const phoneSchema = z
  .string()
  .trim()
  .regex(PHONE_REGEX, 'Nömrə +994XXXXXXXXX formatında olmalıdır');

export const passwordSchema = z
  .string()
  .min(AUTH.PASSWORD_MIN, `Parol ən azı ${AUTH.PASSWORD_MIN} simvol olmalıdır`)
  .max(AUTH.PASSWORD_MAX, 'Parol çox uzundur')
  // Azərbaycan hərfləri (ə, ğ, ı, ö, ü, ş, ç) da hərf sayılır, ona görə
  // ASCII aralığı deyil, Unicode hərf sinfi işlədilir.
  .regex(/\p{L}/u, 'Parolda ən azı bir hərf olmalıdır')
  .regex(/\d/, 'Parolda ən azı bir rəqəm olmalıdır');

export const otpSchema = z
  .string()
  .trim()
  .length(AUTH.OTP_LENGTH, `Kod ${AUTH.OTP_LENGTH} rəqəmdən ibarətdir`)
  .regex(/^\d+$/, 'Kod yalnız rəqəmlərdən ibarətdir');

/** Pul həmişə qəpiklə, tam ədəd. Float qadağandır. */
export const moneySchema = z
  .number()
  .int('Qiymət tam ədəd olmalıdır')
  .min(PRICE.MIN, 'Qiymət çox aşağıdır')
  .max(PRICE.MAX, 'Qiymət çox yüksəkdir');

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email('Yanlış e-poçt ünvanı');

/** Kursor əsaslı paginasiya — offset istifadə olunmur. */
export const paginationQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(PAGINATION.MAX_LIMIT)
    .default(PAGINATION.DEFAULT_LIMIT),
});
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export interface Page<T> {
  items: T[];
  nextCursor: string | null;
  total?: number;
}

/**
 * Səhifə əsaslı paginasiya — YALNIZ axtarış üçün.
 *
 * Lent və siyahılarda kursor işlənir, amma filtrli axtarışda istifadəçi
 * "neçə nəticə var" və "3-cü səhifə" gözləyir; həm də uyğunluq sıralaması
 * bütün nəticə dəsti üzərində hesablanır, ona görə kursor uyğun gəlmir.
 */
export const pageQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(200).default(1),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(PAGINATION.MAX_LIMIT)
    .default(PAGINATION.DEFAULT_LIMIT),
});
export type PageQuery = z.infer<typeof pageQuerySchema>;

export interface PagedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageCount: number;
  /** Nəticə sayı hesablama pəncərəsini aşıbsa true — "300+" kimi göstərilir. */
  capped: boolean;
}

/** Vahid xəta formatı — bütün endpoint-lər bunu qaytarır. */
export interface ApiError {
  error: {
    code: string;
    message: string;
    fields?: Record<string, string[]>;
  };
}

/** Vergüllə ayrılmış query parametrini massivə çevirir: `?districtId=a,b,c` */
export const csvArray = <T extends z.ZodTypeAny>(item: T) =>
  z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((v) => {
      if (v === undefined) return undefined;
      const parts = Array.isArray(v) ? v : v.split(',');
      return parts.map((p) => p.trim()).filter(Boolean);
    })
    .pipe(z.array(item).optional());
