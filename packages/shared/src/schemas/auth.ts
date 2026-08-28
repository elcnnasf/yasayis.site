/**
 * Autentifikasiya sxemləri  (PROMPT A3)
 *
 * Üç giriş yolu: e-poçt + parol, Google OAuth, telefon + OTP.
 * Rollar additivdir — qeydiyyatda seçilən rol digərini bağlamır, sonradan
 * profil bölməsindən ikinci rol da açıla bilər.
 */

import { z } from 'zod';
import { PROFILE } from '../constants';
import { emailSchema, otpSchema, passwordSchema, phoneSchema } from './common';

/** Qeydiyyatda istifadəçi hansı rolla başladığını seçir — sonra dəyişə bilər. */
export const initialRoleSchema = z.enum(['STUDENT', 'OWNER', 'BOTH']);
export type InitialRole = z.infer<typeof initialRoleSchema>;

export const registerSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    passwordConfirm: z.string(),
    fullName: z
      .string()
      .trim()
      .min(PROFILE.FULL_NAME_MIN, 'Ad və soyadınızı yazın')
      .max(PROFILE.FULL_NAME_MAX, 'Çox uzundur'),
    phone: phoneSchema.optional(),
    role: initialRoleSchema.default('STUDENT'),
    acceptedTerms: z.literal(true, {
      errorMap: () => ({ message: 'İstifadə şərtlərini qəbul etməlisiniz' }),
    }),
  })
  .refine((d) => d.password === d.passwordConfirm, {
    message: 'Parollar üst-üstə düşmür',
    path: ['passwordConfirm'],
  });
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Parolu daxil edin'),
});
export type LoginInput = z.infer<typeof loginSchema>;

/** Google OAuth — client `code`-u alır, API onu token-ə dəyişir. */
export const googleAuthSchema = z.object({
  code: z.string().min(10, 'Google kodu yanlışdır'),
  redirectUri: z.string().url().optional(),
  role: initialRoleSchema.default('STUDENT'),
});
export type GoogleAuthInput = z.infer<typeof googleAuthSchema>;

// --- Telefon və OTP --------------------------------------------------------

export const requestOtpSchema = z.object({
  phone: phoneSchema,
  purpose: z.enum(['PHONE_VERIFY', 'LOGIN', 'PASSWORD_RESET']).default('PHONE_VERIFY'),
});
export type RequestOtpInput = z.infer<typeof requestOtpSchema>;

export const verifyOtpSchema = z.object({
  phone: phoneSchema,
  code: otpSchema,
  purpose: z.enum(['PHONE_VERIFY', 'LOGIN', 'PASSWORD_RESET']).default('PHONE_VERIFY'),
});
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;

// --- Parol -----------------------------------------------------------------

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Cari parolu daxil edin'),
    newPassword: passwordSchema,
    newPasswordConfirm: z.string(),
  })
  .refine((d) => d.newPassword === d.newPasswordConfirm, {
    message: 'Parollar üst-üstə düşmür',
    path: ['newPasswordConfirm'],
  });
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const resetPasswordSchema = z
  .object({
    phone: phoneSchema,
    code: otpSchema,
    newPassword: passwordSchema,
    newPasswordConfirm: z.string(),
  })
  .refine((d) => d.newPassword === d.newPasswordConfirm, {
    message: 'Parollar üst-üstə düşmür',
    path: ['newPasswordConfirm'],
  });
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

// --- Rol idarəetməsi (additiv) --------------------------------------------

/**
 * İstifadəçi özü ikinci rolu aça bilər.
 * `false` göndərmək rolu bağlayır, amma admin rolunu heç kim özünə verə bilmir.
 */
export const updateOwnRolesSchema = z
  .object({
    isStudent: z.boolean().optional(),
    isOwner: z.boolean().optional(),
  })
  .refine((d) => d.isStudent !== undefined || d.isOwner !== undefined, {
    message: 'Ən azı bir rol göndərilməlidir',
  });
export type UpdateOwnRolesInput = z.infer<typeof updateOwnRolesSchema>;

// --- Cavab tipləri ---------------------------------------------------------

export interface SessionUserDto {
  id: string;
  email: string | null;
  phone: string | null;
  fullName: string;
  avatarUrl: string | null;
  isStudent: boolean;
  isOwner: boolean;
  isAdmin: boolean;
  phoneVerified: boolean;
  emailVerified: boolean;
  /** false olduqda client onboarding axınına yönləndirir (Prompt C1). */
  onboarded: boolean;
}

export interface AuthResultDto {
  user: SessionUserDto;
  /** Refresh token cookie ilə gedir — cavab gövdəsində göndərilmir. */
  accessToken: string;
  expiresIn: number;
}
