/**
 * Demo seed — bazanı NÜMAYİŞ məlumatı ilə doldurur.
 *
 * `seed.ts`-dən AYRIDIR və ayrıca çağırılır (`npm run db:seed:demo`). Səbəb:
 * əsas seed yalnız taksonomiya yazır və istehsalatda da işlədilə bilər; bu
 * fayl isə saxta istifadəçi və elan yaradır, ona görə heç vaxt avtomatik
 * işləməməlidir.
 *
 * Nə üçün lazımdır: boş bazada axtarış, elan detalı, favorit, otaq yoldaşı
 * uyğunluğu və əlaqə axınlarının heç biri uçdan-uca yoxlana bilmir. Nümunə
 * data bu axınları işlək edir.
 *
 * Idempotentdir: təkrar işlədilə bilər, dublikat yaratmır (e-poçt və slug
 * unikal açar kimi işlənir).
 *
 * Təmizləmək üçün: `npm run db:seed:demo -- --temizle`
 *
 * DİQQƏT — yaradılan hesabların parolu məlumdur (`DEMO_PASSWORD`). Bu skript
 * ictimai bazada işlədilməməlidir.
 */

import './load-env';
import { PrismaClient, type Amenity } from '@prisma/client';
import { hash } from '@node-rs/argon2';

const prisma = new PrismaClient();

/** Bütün nümunə hesablar bu domendədir — təmizləmə buna görə işləyir. */
const DEMO_DOMAIN = '@demo.yasayis.site';
const DEMO_PASSWORD = process.env.DEMO_PASSWORD ?? 'Yasayis2026!';

// ---------------------------------------------------------------------------
// Məlumat
// ---------------------------------------------------------------------------

/**
 * Şəkillər `apps/web/public/demo/` altındadır və nisbi ünvanla saxlanılır.
 * Supabase Storage-a yükləmək lazım deyil: bunlar nümunədir və repoda gəlir.
 */
const PHOTOS = [
  '/demo/ev-1.jpg',
  '/demo/ev-2.jpg',
  '/demo/ev-3.jpg',
  '/demo/ev-4.jpg',
  '/demo/ev-5.jpg',
  '/demo/ev-6.jpg',
];

interface DemoListing {
  slug: string;
  title: string;
  districtSlug: string;
  /** Qəpiklə. */
  price: number;
  utilitiesIncluded: boolean;
  deposit: number | null;
  roomCount: number;
  vacantRoomCount: number;
  currentOccupantsCount: number;
  amenities: Amenity[];
  description: string;
  photo: string;
  /** Universitetə piyada məsafə — yalnız 5/10/15/30 ola bilər. */
  nearby: { uniSlug: string; minutes: number }[];
  suitableForWomen: boolean;
  suitableForMen: boolean;
}

const LISTINGS: DemoListing[] = [
  {
    slug: 'nerimanovda-2-otaqli-menzil-telebelere',
    title: 'Nərimanovda 2 otaqlı mənzil, tələbələrə',
    districtSlug: 'narimanov',
    price: 30_000,
    utilitiesIncluded: true,
    deposit: 30_000,
    roomCount: 2,
    vacantRoomCount: 1,
    currentOccupantsCount: 1,
    amenities: ['WIFI', 'MEBEL', 'KOMBI', 'PALTARYUYAN', 'METROYA_YAXIN'],
    description:
      'Mənzil metroya 5 dəqiqəlik piyada məsafədədir, təmirlidir və tam mebellidir.\n\nOtaqda çarpayı, şkaf və iş masası var. Mətbəx və hamam ortaqdır. Hazırda mənzildə bir tələbə yaşayır — sakit və səliqəlidir.',
    photo: PHOTOS[0],
    nearby: [
      { uniSlug: 'bdu', minutes: 15 },
      { uniSlug: 'aztu', minutes: 10 },
    ],
    suitableForWomen: true,
    suitableForMen: false,
  },
  {
    slug: 'genclikde-ayrica-otaq-telebe-qiz-ucun',
    title: 'Gənclikdə ayrıca otaq, tələbə qız üçün',
    districtSlug: 'narimanov',
    price: 25_000,
    utilitiesIncluded: false,
    deposit: 25_000,
    roomCount: 3,
    vacantRoomCount: 1,
    currentOccupantsCount: 2,
    amenities: ['WIFI', 'MEBEL', 'SOYUDUCU', 'BALKON'],
    description:
      'Gənclik metrosuna 7 dəqiqə. Mənzildə iki tələbə qız yaşayır, üçüncü otaq boşdur.\n\nKommunal xərc bölünür, ayda təxminən 25–35 manat düşür. Ev sahibi mənzildə yaşamır.',
    photo: PHOTOS[1],
    nearby: [
      { uniSlug: 'aztu', minutes: 10 },
      { uniSlug: 'unec', minutes: 15 },
    ],
    suitableForWomen: true,
    suitableForMen: false,
  },
  {
    slug: '28-may-metrosunun-yaninda-1-otaqli-menzil',
    title: '28 May metrosunun yanında 1 otaqlı mənzil',
    districtSlug: 'nesimi',
    price: 38_000,
    utilitiesIncluded: false,
    deposit: 38_000,
    roomCount: 1,
    vacantRoomCount: 0,
    currentOccupantsCount: 0,
    amenities: ['WIFI', 'KONDISIONER', 'MEBEL', 'LIFT', 'METROYA_YAXIN'],
    description:
      'Tam ayrıca 1 otaqlı mənzil — otaq yoldaşı yoxdur. Binada lift var, mənzil 6-cı mərtəbədədir.\n\n28 May metrosuna 3 dəqiqə, UNEC-ə piyada 5 dəqiqə.',
    photo: PHOTOS[2],
    nearby: [
      { uniSlug: 'unec', minutes: 5 },
      { uniSlug: 'bdu', minutes: 15 },
    ],
    suitableForWomen: true,
    suitableForMen: true,
  },
  {
    slug: 'yasamalda-3-otaqli-menzil-2-otaq-bos',
    title: 'Yasamalda 3 otaqlı mənzil, 2 otaq boşdur',
    districtSlug: 'yasamal',
    price: 22_000,
    utilitiesIncluded: true,
    deposit: null,
    roomCount: 3,
    vacantRoomCount: 2,
    currentOccupantsCount: 1,
    amenities: ['WIFI', 'MEBEL', 'KOMBI', 'SOYUDUCU'],
    description:
      'Qiymət BİR otaq üçündür. İki otaq boşdur — birlikdə köçmək istəyən iki tələbə üçün əlverişlidir.\n\nBDU-ya avtobusla 10 dəqiqə. Mənzildə kombi var, qış xərci aşağıdır.',
    photo: PHOTOS[3],
    nearby: [
      { uniSlug: 'bdu', minutes: 10 },
      { uniSlug: 'azmiu', minutes: 15 },
    ],
    suitableForWomen: false,
    suitableForMen: true,
  },
  {
    slug: 'elmler-akademiyasi-yaxininda-ayrica-otaq',
    title: 'Elmlər Akademiyası yaxınında ayrıca otaq',
    districtSlug: 'yasamal',
    price: 28_000,
    utilitiesIncluded: true,
    deposit: 28_000,
    roomCount: 2,
    vacantRoomCount: 1,
    currentOccupantsCount: 1,
    amenities: ['WIFI', 'MEBEL', 'KONDISIONER', 'METROYA_YAXIN', 'BALKON'],
    description:
      'Elmlər Akademiyası metrosuna 4 dəqiqə. BDU-nun əsas korpusuna piyada getmək olar.\n\nOtaq mebellidir: çarpayı, şkaf, iş masası və kitab rəfi. İnternet qiymətə daxildir.',
    photo: PHOTOS[4],
    nearby: [
      { uniSlug: 'bdu', minutes: 5 },
      { uniSlug: 'adpu', minutes: 15 },
    ],
    suitableForWomen: true,
    suitableForMen: true,
  },
  {
    slug: 'xetaide-2-otaqli-temirli-menzil',
    title: 'Xətaidə 2 otaqlı təmirli mənzil',
    districtSlug: 'xetai',
    price: 34_000,
    utilitiesIncluded: false,
    deposit: 34_000,
    roomCount: 2,
    vacantRoomCount: 1,
    currentOccupantsCount: 1,
    amenities: ['WIFI', 'MEBEL', 'PALTARYUYAN', 'LIFT', 'PARKINQ'],
    description:
      'Yeni təmirli mənzil, Xətai metrosuna 8 dəqiqə. Həyətdə pulsuz parkinq var.\n\nADNSU-ya marşrutla 15 dəqiqə. Mənzildə bir magistr tələbəsi yaşayır.',
    photo: PHOTOS[5],
    nearby: [
      { uniSlug: 'adnsu', minutes: 15 },
      { uniSlug: 'unec', minutes: 15 },
    ],
    suitableForWomen: false,
    suitableForMen: true,
  },
];

interface DemoStudent {
  key: string;
  fullName: string;
  uniSlug: string;
  majorSlug: string;
  districtSlugs: string[];
  budgetMin: number;
  budgetMax: number;
  lifestyle: 'SAKIT' | 'SOSIAL' | 'FERQI_YOXDUR';
  smoking: 'CEKMIREM' | 'CEKIREM' | 'FERQI_YOXDUR';
  petsAttitude: 'SEVIREM' | 'PROBLEM_DEYIL' | 'ISTEMIREM';
  bio: string;
}

const STUDENTS: DemoStudent[] = [
  {
    key: 'aysel',
    fullName: 'Aysel Məmmədova',
    uniSlug: 'bdu',
    majorSlug: 'kompyuter-elmleri',
    districtSlugs: ['narimanov'],
    budgetMin: 25_000,
    budgetMax: 30_000,
    lifestyle: 'SAKIT',
    smoking: 'CEKMIREM',
    petsAttitude: 'PROBLEM_DEYIL',
    bio: 'BDU-da kompüter elmləri oxuyuram. Sakit mühit sevirəm, axşamlar əsasən evdə işləyirəm.',
  },
  {
    key: 'murad',
    fullName: 'Murad Əliyev',
    uniSlug: 'aztu',
    majorSlug: 'kompyuter-muhendisliyi',
    districtSlugs: ['narimanov', 'nesimi'],
    budgetMin: 20_000,
    budgetMax: 30_000,
    lifestyle: 'SAKIT',
    smoking: 'CEKMIREM',
    petsAttitude: 'PROBLEM_DEYIL',
    bio: 'AzTU-da kompüter mühəndisliyi. Səliqəli və vaxtında ödəyən otaq yoldaşı axtarıram.',
  },
  {
    key: 'nihat',
    fullName: 'Nihat Rzayev',
    uniSlug: 'adnsu',
    majorSlug: 'iqtisadiyyat',
    districtSlugs: ['nesimi'],
    budgetMin: 25_000,
    budgetMax: 25_000,
    lifestyle: 'FERQI_YOXDUR',
    smoking: 'FERQI_YOXDUR',
    petsAttitude: 'PROBLEM_DEYIL',
    bio: 'ADNSU tələbəsiyəm. Universitetə yaxın, metro ətrafında yer axtarıram.',
  },
  {
    key: 'nigar',
    fullName: 'Nigar Həsənli',
    uniSlug: 'unec',
    majorSlug: 'iqtisadiyyat',
    districtSlugs: ['narimanov', 'yasamal'],
    budgetMin: 30_000,
    budgetMax: 40_000,
    lifestyle: 'SOSIAL',
    smoking: 'CEKMIREM',
    petsAttitude: 'SEVIREM',
    bio: 'UNEC-də maliyyə oxuyuram. Ünsiyyətcil otaq yoldaşı axtarıram, pişiyim var.',
  },
];

// ---------------------------------------------------------------------------
// Köməkçilər
// ---------------------------------------------------------------------------

async function idMap(
  rows: { id: string; slug: string }[],
): Promise<Map<string, string>> {
  return new Map(rows.map((r) => [r.slug, r.id]));
}

function need(map: Map<string, string>, slug: string, what: string): string {
  const id = map.get(slug);
  if (!id) {
    throw new Error(
      `${what} tapılmadı: "${slug}". Əvvəlcə taksonomiya seed-i işlədin: npm run db:seed`,
    );
  }
  return id;
}

// ---------------------------------------------------------------------------
// Təmizləmə
// ---------------------------------------------------------------------------

/**
 * Nümunə hesabları və onların bütün əlaqəli sətirlərini silir.
 * `onDelete: Cascade` sayəsində istifadəçini silmək əmlakı, elanı, şəkli və
 * profili də aparır — ayrıca silmə lazım deyil.
 *
 * KÖHNƏ DOMENLƏR də silinir: brend domeni `yasayis.az`-dan `yasayis.site`-a
 * keçəndə əvvəl yaradılmış nümunə hesablar yeni naxışa uymur və təmizləmədən
 * kənarda qalırdı — bazada həmişəlik qalan "yetim" demo data yaranırdı.
 */
const DEMO_DOMAINS = ['@demo.yasayis.site', '@demo.yasayis.az'];

async function clean(): Promise<void> {
  const { count } = await prisma.user.deleteMany({
    where: { OR: DEMO_DOMAINS.map((domain) => ({ email: { endsWith: domain } })) },
  });
  console.log(`  silindi      → ${count} nümunə hesab (və onlara bağlı hər şey)`);
}

// ---------------------------------------------------------------------------
// Yazma
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const wantsClean = process.argv.includes('--temizle');

  console.log('Yaşayış — nümunə data\n');

  if (wantsClean) {
    await clean();
    console.log('\nHazırdır.');
    return;
  }

  const [cityRows, districtRows, uniRows, majorRows] = await Promise.all([
    prisma.city.findMany({ select: { id: true, slug: true } }),
    prisma.district.findMany({ select: { id: true, slug: true } }),
    prisma.university.findMany({ select: { id: true, slug: true } }),
    prisma.major.findMany({ select: { id: true, slug: true } }),
  ]);

  const cities = await idMap(cityRows);
  const districts = await idMap(districtRows);
  const unis = await idMap(uniRows);
  const majors = await idMap(majorRows);

  const bakuId = need(cities, 'baki', 'Şəhər');
  const passwordHash = await hash(DEMO_PASSWORD);
  const now = new Date();

  // --- Ev sahibi ---------------------------------------------------------
  const ownerEmail = `sahib${DEMO_DOMAIN}`;
  const owner = await prisma.user.upsert({
    where: { email: ownerEmail },
    update: { isOwner: true, status: 'ACTIVE' },
    create: {
      email: ownerEmail,
      phone: '+994501112233',
      passwordHash,
      fullName: 'Rəşad Quliyev',
      isOwner: true,
      phoneVerifiedAt: now,
      emailVerifiedAt: now,
      onboardedAt: now,
      ownerProfile: {
        create: {
          verificationStatus: 'VERIFIED',
          isCompany: false,
          about: 'Bakıda bir neçə mənzili tələbələrə kirayə verirəm.',
        },
      },
    },
  });
  console.log(`  ev sahibi    → ${ownerEmail}`);

  // --- Əmlak + elan ------------------------------------------------------
  for (const item of LISTINGS) {
    const districtId = need(districts, item.districtSlug, 'Rayon');

    // Elan slug-ı unikaldır — mövcud elanı tapıb onun əmlakını yeniləyirik ki,
    // təkrar işlədildikdə ikinci nüsxə yaranmasın.
    const existing = await prisma.listing.findUnique({
      where: { slug: item.slug },
      select: { id: true, propertyId: true },
    });

    const propertyData = {
      ownerId: owner.id,
      title: item.title,
      cityId: bakuId,
      districtId,
      address: 'Ünvan əlaqə qurduqdan sonra paylaşılır',
      price: item.price,
      utilitiesIncluded: item.utilitiesIncluded,
      deposit: item.deposit,
      roomCount: item.roomCount,
      vacantRoomCount: item.vacantRoomCount,
      currentOccupantsCount: item.currentOccupantsCount,
    };

    const propertyId = existing
      ? (await prisma.property.update({
          where: { id: existing.propertyId },
          data: propertyData,
        })).id
      : (await prisma.property.create({ data: propertyData })).id;

    // Şəkil və məsafələr hər dəfə yenidən qurulur — sadə və dublikatsız.
    await prisma.propertyImage.deleteMany({ where: { propertyId } });
    await prisma.propertyImage.create({
      data: {
        propertyId,
        url: item.photo,
        thumbUrl: item.photo,
        width: 900,
        height: 675,
        sortOrder: 0,
        isCover: true,
      },
    });

    await prisma.propertyUniversityDistance.deleteMany({ where: { propertyId } });
    for (const n of item.nearby) {
      await prisma.propertyUniversityDistance.create({
        data: {
          propertyId,
          universityId: need(unis, n.uniSlug, 'Universitet'),
          minutes: n.minutes,
        },
      });
    }

    const listingData = {
      status: 'ACTIVE' as const,
      description: item.description,
      suitableForStudents: true,
      suitableForWomen: item.suitableForWomen,
      suitableForMen: item.suitableForMen,
      isMixed: item.suitableForWomen && item.suitableForMen,
      petsAllowed: false,
      smokingRule: 'BALKONDA' as const,
      guestRules: 'RAZILASMAQLA' as const,
      amenities: item.amenities,
      publishedAt: now,
      // Elan müddəti 60 gündür — bitmiş elan siyahıda görünmür.
      expiresAt: new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000),
    };

    await prisma.listing.upsert({
      where: { slug: item.slug },
      update: listingData,
      create: { ...listingData, slug: item.slug, propertyId },
    });
  }
  console.log(`  elan         → ${LISTINGS.length} (hamısı AKTİV)`);

  // --- Tələbələr ---------------------------------------------------------
  for (const s of STUDENTS) {
    const email = `${s.key}${DEMO_DOMAIN}`;

    const user = await prisma.user.upsert({
      where: { email },
      update: { isStudent: true, status: 'ACTIVE' },
      create: {
        email,
        passwordHash,
        fullName: s.fullName,
        isStudent: true,
        // Telefon təsdiqi olmadan profil otaq yoldaşı bazarında GÖRÜNMÜR.
        phoneVerifiedAt: now,
        emailVerifiedAt: now,
        onboardedAt: now,
      },
    });

    const profile = await prisma.studentProfile.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id },
    });

    await prisma.studentProfile.update({
      where: { id: profile.id },
      data: {
        universityId: need(unis, s.uniSlug, 'Universitet'),
        majorId: need(majors, s.majorSlug, 'İxtisas'),
        cityId: bakuId,
        bio: s.bio,
        budgetMin: s.budgetMin,
        budgetMax: s.budgetMax,
        lifestyle: s.lifestyle,
        smoking: s.smoking,
        petsAttitude: s.petsAttitude,
        lookingFor: 'OTAQ_YOLDASI',
        onboardingStep: 9,
        // Nümunə profillərdə büdcə açıqdır ki, uyğunluq kartı tam görünsün.
        budgetIsPublic: true,
      },
    });

    await prisma.studentDistrictPreference.deleteMany({
      where: { studentProfileId: profile.id },
    });
    for (const slug of s.districtSlugs) {
      await prisma.studentDistrictPreference.create({
        data: {
          studentProfileId: profile.id,
          districtId: need(districts, slug, 'Rayon'),
        },
      });
    }

    await prisma.roommateProfile.upsert({
      where: { userId: user.id },
      update: { active: true, visible: true },
      create: { userId: user.id, active: true, visible: true },
    });
  }
  console.log(`  tələbə       → ${STUDENTS.length} (otaq yoldaşı bazarında görünür)`);

  console.log(`\nGiriş: ${STUDENTS[0].key}${DEMO_DOMAIN} / ${DEMO_PASSWORD}`);
  console.log('Hazırdır.');
}

main()
  .catch((e: unknown) => {
    console.error('\nNümunə seed uğursuz oldu:', e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
