/**
 * Seed — boş bazanı işlək vəziyyətə gətirir  (PROMPT A2)
 *
 * Idempotentdir: dəfələrlə işlədilə bilər, dublikat yaratmır.
 * Yalnız taksonomiya yazılır — elan və ya saxta istifadəçi yaradılmır.
 *
 * Admin hesabı yalnız SEED_ADMIN_EMAIL və SEED_ADMIN_PASSWORD verildikdə açılır.
 * Parol heç vaxt bu fayla yazılmır.
 */

import './load-env';
import { PrismaClient } from '@prisma/client';
import { hash } from '@node-rs/argon2';
import {
  cities,
  districts,
  majors,
  monetizationProducts,
  universities,
} from './data/taxonomy';

const prisma = new PrismaClient();

async function seedCities(): Promise<Map<string, string>> {
  const ids = new Map<string, string>();
  for (const c of cities) {
    const row = await prisma.city.upsert({
      where: { slug: c.slug },
      update: { name: c.name, nameRu: c.nameRu ?? null, sortOrder: c.sortOrder },
      create: { slug: c.slug, name: c.name, nameRu: c.nameRu ?? null, sortOrder: c.sortOrder },
    });
    ids.set(c.slug, row.id);
  }
  console.log(`  şəhər        → ${cities.length}`);
  return ids;
}

async function seedDistricts(cityIds: Map<string, string>): Promise<void> {
  for (const d of districts) {
    const cityId = cityIds.get(d.citySlug);
    if (!cityId) throw new Error(`Rayon üçün şəhər tapılmadı: ${d.citySlug}`);
    await prisma.district.upsert({
      where: { cityId_slug: { cityId, slug: d.slug } },
      update: { name: d.name, nameRu: d.nameRu ?? null, sortOrder: d.sortOrder },
      create: {
        cityId,
        slug: d.slug,
        name: d.name,
        nameRu: d.nameRu ?? null,
        sortOrder: d.sortOrder,
      },
    });
  }
  console.log(`  rayon        → ${districts.length}`);
}

async function seedUniversities(cityIds: Map<string, string>): Promise<void> {
  for (const u of universities) {
    const cityId = u.citySlug ? cityIds.get(u.citySlug) : null;
    if (u.citySlug && !cityId) {
      throw new Error(`Universitet üçün şəhər tapılmadı: ${u.citySlug}`);
    }
    await prisma.university.upsert({
      where: { slug: u.slug },
      update: {
        cityId: cityId ?? null,
        name: u.name,
        shortName: u.shortName,
        isOther: u.isOther ?? false,
        sortOrder: u.sortOrder,
      },
      create: {
        cityId: cityId ?? null,
        slug: u.slug,
        name: u.name,
        shortName: u.shortName,
        isOther: u.isOther ?? false,
        sortOrder: u.sortOrder,
      },
    });
  }
  console.log(`  universitet  → ${universities.length} ("Digər" seçimi daxil)`);
}

async function seedMajors(): Promise<void> {
  for (const m of majors) {
    await prisma.major.upsert({
      where: { slug: m.slug },
      update: { name: m.name, isOther: m.isOther ?? false, sortOrder: m.sortOrder },
      create: {
        slug: m.slug,
        name: m.name,
        isOther: m.isOther ?? false,
        sortOrder: m.sortOrder,
      },
    });
  }
  console.log(`  ixtisas      → ${majors.length} ("Digər" seçimi daxil)`);
}

/** Sistemdə yalnız bir "Digər" universiteti və bir "Digər" ixtisası ola bilər. */
async function assertSingleOther(): Promise<void> {
  const [uni, major] = await Promise.all([
    prisma.university.count({ where: { isOther: true } }),
    prisma.major.count({ where: { isOther: true } }),
  ]);
  if (uni !== 1) throw new Error(`"Digər" universitet sayı 1 olmalıdır, tapıldı: ${uni}`);
  if (major !== 1) throw new Error(`"Digər" ixtisas sayı 1 olmalıdır, tapıldı: ${major}`);
}

/**
 * Monetizasiya məhsulları — hamısı DEAKTİV yaradılır.
 * Mövcud sətrin `isActive` dəyərinə toxunulmur: admin bir məhsulu açıbsa,
 * seed onu geri bağlamamalıdır.
 */
async function seedProducts(): Promise<void> {
  for (const p of monetizationProducts) {
    await prisma.monetizationProduct.upsert({
      where: { code: p.code },
      update: {
        nameAz: p.nameAz,
        descriptionAz: p.descriptionAz,
        priceQepik: p.priceQepik,
        durationDays: p.durationDays,
        audience: p.audience,
        sortOrder: p.sortOrder,
      },
      create: { ...p, isActive: false },
    });
  }
  console.log(`  məhsul       → ${monetizationProducts.length} (hamısı deaktiv)`);
}

async function seedAdmin(): Promise<void> {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;

  if (!email || !password) {
    console.log('  admin        → ötürüldü (SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD yoxdur)');
    return;
  }

  const passwordHash = await hash(password);
  await prisma.user.upsert({
    where: { email: email.toLowerCase() },
    update: { isAdmin: true },
    create: {
      email: email.toLowerCase(),
      passwordHash,
      fullName: process.env.SEED_ADMIN_NAME ?? 'Sistem Admini',
      isAdmin: true,
      emailVerifiedAt: new Date(),
      onboardedAt: new Date(),
    },
  });

  console.log(`  admin        → ${email}`);
}

async function main(): Promise<void> {
  console.log('Yaşayış — seed başlayır\n');
  const cityIds = await seedCities();
  await seedDistricts(cityIds);
  await seedUniversities(cityIds);
  await seedMajors();
  await assertSingleOther();
  await seedProducts();
  await seedAdmin();
  console.log('\nHazırdır.');
}

main()
  .catch((e: unknown) => {
    console.error('\nSeed uğursuz oldu:', e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
