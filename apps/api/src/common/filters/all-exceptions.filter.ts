import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

/**
 * Vahid xəta formatı.
 *
 * Client həmişə eyni quruluşu alır:
 *   { error: { code, message, fields? } }
 *
 * Mesajlar Azərbaycan dilindədir. Daxili xəta detalları (stack, SQL) heç vaxt
 * cavaba düşmür — yalnız log-a yazılır.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Xəta');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const body = this.buildBody(exception, status);

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `${req.method} ${req.url} → ${status}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    res.status(status).json(body);
  }

  private buildBody(exception: unknown, status: number) {
    if (exception instanceof HttpException) {
      const payload = exception.getResponse();

      // ZodValidationPipe artıq düzgün formatda göndərir — olduğu kimi ötürülür.
      if (isFormatted(payload)) return payload;

      return {
        error: {
          code: codeFor(status),
          message: messageOf(payload) ?? defaultMessage(status),
        },
      };
    }

    return {
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Gözlənilməz xəta baş verdi. Bir azdan yenidən cəhd edin.',
      },
    };
  }
}

function isFormatted(payload: unknown): payload is { error: { code: string } } {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    'error' in payload &&
    typeof (payload as { error: unknown }).error === 'object'
  );
}

function messageOf(payload: unknown): string | null {
  if (typeof payload === 'string') return payload;
  if (typeof payload === 'object' && payload !== null && 'message' in payload) {
    const m = (payload as { message: unknown }).message;
    if (typeof m === 'string') return m;
    if (Array.isArray(m) && typeof m[0] === 'string') return m[0];
  }
  return null;
}

const CODES: Record<number, string> = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  422: 'UNPROCESSABLE',
  429: 'TOO_MANY_REQUESTS',
};

const MESSAGES: Record<number, string> = {
  400: 'Sorğu düzgün deyil',
  401: 'Bu əməliyyat üçün giriş etməlisiniz',
  403: 'Bu əməliyyata icazəniz yoxdur',
  404: 'Tapılmadı',
  409: 'Bu məlumat artıq mövcuddur',
  422: 'Məlumat emal edilə bilmədi',
  429: 'Çox sayda sorğu göndərdiniz. Bir az gözləyin.',
};

const codeFor = (status: number) => CODES[status] ?? 'ERROR';
const defaultMessage = (status: number) => MESSAGES[status] ?? 'Xəta baş verdi';
