import { BadRequestException, PipeTransform } from '@nestjs/common';
import { z, ZodError, type ZodTypeAny } from 'zod';

/**
 * Zod ilə giriş validasiyası.
 *
 * Sxemlər `@yasayis/shared`-dən gəlir — eyni sxem web formunda da işlənir,
 * yəni qayda bir yerdə yazılır. Xəta cavabı vahid formatdadır:
 *   { error: { code, message, fields } }
 */
export class ZodValidationPipe<S extends ZodTypeAny>
  implements PipeTransform<unknown, z.infer<S>>
{
  // Sxemin ÇIXIŞ tipi işlədilir: `default()` olan sahələr girişdə istəyə bağlı,
  // çıxışda isə həmişə doludur — controller məhz çıxış tipini gözləyir.
  constructor(private readonly schema: S) {}

  transform(value: unknown): z.infer<S> {
    const result = this.schema.safeParse(value);
    if (result.success) return result.data;
    throw new BadRequestException({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Daxil edilən məlumatda xəta var',
        fields: fieldErrors(result.error),
      },
    });
  }
}

function fieldErrors(error: ZodError): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.length ? issue.path.join('.') : '_';
    (out[key] ??= []).push(issue.message);
  }
  return out;
}

/** Qısa yazılış: `@Body(zodBody(createListingSchema)) dto: CreateListingInput` */
export const zodBody = <S extends ZodTypeAny>(schema: S) => new ZodValidationPipe(schema);
