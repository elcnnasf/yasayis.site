/**
 * `.env` faylının yüklənməsi — seed skriptləri üçün.
 *
 * NİYƏ AYRICA FAYL
 * `import 'dotenv/config'` faylı YALNIZ cari iş qovluğunda axtarır. Seed
 * skriptləri isə `npm run db:seed` ilə `packages/db` içindən işə düşür və
 * `.env` monorepo KÖKÜNDƏDİR — nəticədə heç bir dəyişən yüklənmirdi və skript
 * "Environment variable not found: DATABASE_URL" ilə dayanırdı. Yəni README-də
 * quraşdırma addımı kimi yazılan `npm run db:seed` təmiz mühitdə heç vaxt
 * işləmirdi.
 *
 * Həll: cari qovluqdan başlayıb yuxarı qalxırıq və tapdığımız ilk `.env`-i
 * yükləyirik. Beləliklə skript həm kökdən, həm də `packages/db` içindən
 * çağırılanda eyni faylı tapır.
 *
 * `import.meta.url` işlədilmir — bu paket CommonJS-dir və skriptlər `tsx` ilə
 * qalxır; qovluq axtarışı hər iki modul sistemində eyni işləyir.
 */

import { config } from 'dotenv';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

function findEnvFile(): string | undefined {
  let dir = process.cwd();

  // Beş səviyyə kifayətdir: `packages/db`-dən kökə iki addımdır.
  for (let depth = 0; depth < 5; depth += 1) {
    const candidate = resolve(dir, '.env');
    if (existsSync(candidate)) return candidate;

    const parent = resolve(dir, '..');
    if (parent === dir) break;
    dir = parent;
  }

  return undefined;
}

const envFile = findEnvFile();
if (envFile) {
  config({ path: envFile });
} else {
  // Xəta atmırıq: CI-də dəyişənlər mühitdən gələ bilər, fayl olmaya bilər.
  console.warn('  xəbərdarlıq → .env tapılmadı, mühit dəyişənləri gözlənilir');
}
