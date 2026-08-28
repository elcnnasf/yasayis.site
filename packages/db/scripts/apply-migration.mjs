/**
 * Miqrasiyanı Supabase Management API vasitəsilə tətbiq edir.
 *
 * NİYƏ LAZIMDIR
 * Tətbiqin işlətdiyi `yasayis_app` rolunun yalnız data hüquqları var (SELECT,
 * INSERT, UPDATE, DELETE) — cədvəl yaratmaq və dəyişmək icazəsi yoxdur. Bu,
 * şüurlu qərardır: işlək tətbiq heç vaxt sxemi dəyişməməlidir.
 *
 * DDL isə Management API üzərindən gedir; orada sorğu `postgres` rolu ilə
 * icra olunur. Beləliklə `postgres` parolunu heç yerdə saxlamağa ehtiyac qalmır.
 *
 * İSTİFADƏ
 *   node packages/db/scripts/apply-migration.mjs            # fərqi hesabla və tətbiq et
 *   node packages/db/scripts/apply-migration.mjs --dry-run  # yalnız SQL-i göstər
 *
 * Skript sxem ilə bazanı müqayisə edir, fərq SQL-ini yaradır, `migrations/`
 * qovluğuna yazır və `_prisma_migrations` cədvəlinə qeyd edir.
 */

import { execFileSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import 'dotenv/config';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../../..');
const schemaPath = join(root, 'packages/db/prisma/schema.prisma');
const migrationsDir = join(root, 'packages/db/prisma/migrations');

const token = process.env.SUPABASE_ACCESS_TOKEN;
const projectRef = process.env.SUPABASE_PROJECT_REF;
const dryRun = process.argv.includes('--dry-run');

if (!token || !projectRef) {
  console.error(
    'SUPABASE_ACCESS_TOKEN və SUPABASE_PROJECT_REF .env faylında olmalıdır.',
  );
  process.exit(1);
}

/** Management API vasitəsilə SQL icra edir. */
async function runSql(query) {
  const response = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    },
  );

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`SQL xətası (${response.status}): ${text.slice(0, 500)}`);
  }
  return text;
}

/** Bazadakı vəziyyət ilə sxem arasındakı fərq. */
function diffSql() {
  return execFileSync(
    'npx',
    [
      'prisma',
      'migrate',
      'diff',
      '--from-url',
      process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? '',
      '--to-schema-datamodel',
      schemaPath,
      '--script',
    ],
    { cwd: root, encoding: 'utf8', shell: process.platform === 'win32' },
  );
}

const sql = diffSql().trim();

if (!sql || sql.startsWith('-- This is an empty migration')) {
  console.log('Dəyişiklik yoxdur — baza sxemlə eynidir.');
  process.exit(0);
}

if (dryRun) {
  console.log(sql);
  process.exit(0);
}

// Ad: 20260826143000_auto formatında — Prisma-nın öz qaydası ilə eynidir.
const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
const name = `${stamp}_auto`;
const dir = join(migrationsDir, name);

if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
writeFileSync(join(dir, 'migration.sql'), sql);

console.log(`Miqrasiya yazıldı: ${name} (${sql.split('\n').length} sətir)`);

await runSql(sql);
console.log('Baza yeniləndi.');

// Tarixçəyə qeyd — əks halda `prisma migrate status` uyğunsuzluq göstərər.
const checksum = createHash('sha256').update(sql).digest('hex');
await runSql(`
  insert into _prisma_migrations (id, checksum, finished_at, migration_name, applied_steps_count)
  values ('${randomUUID()}', '${checksum}', now(), '${name}', 1)
  on conflict do nothing;
`);

console.log('Tarixçəyə yazıldı. Yoxlamaq üçün: npx prisma migrate status');
