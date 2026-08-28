/**
 * API client — web tətbiqində şəbəkəyə çıxan YEGANƏ yer.
 *
 * Komponentlər birbaşa `fetch` çağırmır. Bu qayda sayəsində auth cookie-si,
 * xəta formatı və base URL bir yerdə idarə olunur.
 *
 * Bazaya birbaşa müraciət yoxdur — `@yasayis/db` bu tətbiqə import edilmir.
 */

import type { ApiError } from '@yasayis/shared';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

export class ApiRequestError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly fields?: Record<string, string[]>,
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }

  /** Form sahəsinə aid xəta mesajı. */
  fieldError(name: string): string | undefined {
    return this.fields?.[name]?.[0];
  }
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  /** Serverdə render zamanı istifadəçinin cookie-lərini ötürmək üçün. */
  cookie?: string;
  /** Next.js keş davranışı — taksonomiya kimi nadir dəyişən data üçün. */
  revalidate?: number | false;
}

/**
 * Sessiyanın avtomatik uzadılması.
 *
 * Access token 15 dəqiqəlikdir, refresh token 30 günlük. Bu olmadan istifadəçi
 * 15 dəqiqədən sonra heç bir xəbərdarlıq almadan "çıxmış" olurdu: hər sorğu 401
 * qaytarır, ekran boşalır, halbuki sessiya əslində hələ etibarlıdır.
 *
 * Bir anda YALNIZ BİR yeniləmə sorğusu gedir — səhifədə paralel işləyən beş
 * komponent eyni vaxtda 401 alanda beş dəfə refresh etsəydi, token rotasiyası
 * bir-birini ləğv edərdi və istifadəçi həqiqətən çıxarılardı.
 */
let refreshInFlight: Promise<boolean> | null = null;

export function refreshSession(): Promise<boolean> {
  refreshInFlight ??= fetch(`${BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: { Accept: 'application/json' },
    credentials: 'include',
  })
    .then((r) => r.ok)
    .catch(() => false)
    .finally(() => {
      refreshInFlight = null;
    });

  return refreshInFlight;
}

/** Yeniləmə cəhdinin özü də 401 qaytara bilər — sonsuz dövrəyə girməmək üçün. */
const NO_RETRY = new Set(['/auth/refresh', '/auth/login', '/auth/register', '/auth/logout']);

async function send(path: string, options: RequestOptions): Promise<Response> {
  const { body, cookie, revalidate, headers, ...init } = options;

  return fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    credentials: 'include',
    ...(revalidate === undefined ? {} : { next: { revalidate } }),
  });
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  let response = await send(path, options);

  // 401 = access token bitib. Refresh cookie-si hələ etibarlıdırsa, sessiya
  // səssizcə uzadılır və sorğu BİR DƏFƏ təkrarlanır. Server tərəfli render-də
  // cookie-ni geri yazmaq mümkün deyil, ona görə orada təkrar cəhd edilmir.
  if (
    response.status === 401 &&
    typeof window !== 'undefined' &&
    !NO_RETRY.has(path.split('?')[0] ?? path) &&
    (await refreshSession())
  ) {
    response = await send(path, options);
  }

  if (response.status === 204) return undefined as T;

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const err = (payload as ApiError | null)?.error;
    throw new ApiRequestError(
      response.status,
      err?.code ?? 'UNKNOWN',
      err?.message ?? 'Serverlə əlaqə alınmadı',
      err?.fields,
    );
  }

  return payload as T;
}

const query = (params?: Record<string, unknown>): string => {
  if (!params) return '';
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    search.set(key, Array.isArray(value) ? value.join(',') : String(value));
  }
  const s = search.toString();
  return s ? `?${s}` : '';
};

export const api = {
  get: <T>(path: string, params?: Record<string, unknown>, options?: RequestOptions) =>
    request<T>(`${path}${query(params)}`, { ...options, method: 'GET' }),

  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'POST', body }),

  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'PATCH', body }),

  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'DELETE' }),
};

/**
 * Xəta mesajının istifadəçiyə göstərilən forması.
 *
 * Server 4xx mesajları qəsdən oxunaqlıdır ("Bu nömrə başqa hesaba bağlıdır")
 * və olduğu kimi göstərilir. 5xx isə daxili detal daşıya bilər — orada həmişə
 * çağıran tərəfin verdiyi ümumi mətn işlədilir.
 */
export function messageOf(error: unknown, fallback: string): string {
  if (error instanceof ApiRequestError) {
    return error.status >= 500 ? fallback : error.message;
  }
  return fallback;
}
