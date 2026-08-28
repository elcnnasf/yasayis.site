/**
 * Prisma client — yeganə baza giriş nöqtəsi.
 *
 * Yalnız `apps/api` bu paketi import edir. `apps/web` heç vaxt bazaya
 * birbaşa toxunmur (bax: docs/01-memarliq-ve-data-modeli.md §1.4).
 */

import { PrismaClient } from '@prisma/client';

export * from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/**
 * Dev-də hot reload hər dəfə yeni client yaradıb bağlantı hovuzunu doldurmasın deyə
 * global-da saxlanılır. Supabase pooler-in bağlantı limiti dardır.
 */
export const prisma: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'warn', 'error']
        : ['warn', 'error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
