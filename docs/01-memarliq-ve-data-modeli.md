# Yaşayış — Memarlıq və Data Modeli (v1 / MVP)

> **DİQQƏT — bu sənədin 2 və 3-cü bölmələri köhnəlib.**
> Data modeli PROMPT A1 spesifikasiyası ilə əvəz olunub. İşlək sxem:
> `packages/db/prisma/schema.prisma`. Əsas fərqlər:
> · Rollar `UserRole` cədvəli deyil, `User` üzərində additiv bool sahələrdir
>   (`is_student`, `is_owner`, `is_admin`).
> · Vahid `Listing` + tipli detal cədvəlləri əvəzinə `Property` (fiziki obyekt)
>   və `Listing` (elan) ayrılığı.
> · Otaq yoldaşı bazarı ayrıca `RoommateProfile` entity-sidir.
> · Amenity admin cədvəli deyil, Postgres enum massividir.
> · `Major` (ixtisas) və `University.is_other` əlavə olunub.
> · `SearchAlert`, `Notification`, `Verification`, `Message` (yalnız sxem) əlavə olunub.
>
> 1, 4–11-ci bölmələr (texnologiya seçimi, uyğunluq formulu, icazə matrisi,
> keyfiyyət standartları, MVP sərhədi) qüvvədədir.

> Bu sənəd kod yazılmazdan əvvəlki yeganə həqiqət mənbəyidir (single source of truth).
> Hər yeni tapşırıq bu sənədin sərhədləri daxilində icra olunur.

Tarix: 2026-08-26 · Status: təsdiq gözləyir · Versiya: 1.0

---

## 1. Texnologiya seçimi

### 1.1 Tövsiyə (qərar)

| Təbəqə | Seçim | Səbəb |
|---|---|---|
| Frontend | **Next.js 15 (App Router) + TypeScript** | Elan səhifələri SEO-dan asılıdır. SSR/ISR ilə `yasayis.az/elan/...` və şəhər landing səhifələri indeksləşir. |
| Backend | **NestJS 11 + TypeScript** | Modul + DI + Guard strukturu additiv rol sistemi üçün birbaşa uyğundur. FE/BE fiziki olaraq ayrıdır. |
| Baza | **PostgreSQL 16** | Əlaqəli data, tranzaksiya, partial index, full-text axtarış — hamısı bir yerdə. |
| ORM | **Prisma** | Tipli sorğular, migration tarixçəsi, `packages/db` vasitəsilə hər iki app üçün ortaq. |
| Validasiya | **Zod** (ortaq sxemlər) | Eyni sxem həm API DTO, həm form validasiyası üçün. Bir dəfə yaz, iki yerdə işlət. |
| UI | **Tailwind CSS + öz komponent kitabxanamız** | Hazır tema deyil — brend tokenləri üzərində qurulur. |
| Auth | **JWT (access + refresh), httpOnly cookie** | Ayrı API ilə işləyir, sessiya oğurluğuna qarşı davamlıdır. |
| Fayl saxlama | **S3-uyğun obyekt storage** (dev-də MinIO) | Şəkillər DB-də saxlanılmır, yalnız URL. |
| Deploy | **Docker Compose / VPS** | Vendor lock-in yoxdur, yerli hostinqə köçürülə bilər. |

### 1.2 Niyə Supabase yox

Sürətli başlanğıc verir, amma: (a) additiv rol modelini RLS ilə ifadə etmək mürəkkəbləşir,
(b) moderasiya axını və audit log server tərəfli məntiq tələb edir,
(c) "frontend və backend aydın ayrılmalıdır" tələbi pozulur.
Əgər komanda 1 nəfərdirsə və 3 həftəyə çıxmaq lazımdırsa — Supabase məqbul kompromisdir.

### 1.3 Niyə tək Next.js app yox

Tək app-da da təmiz təbəqələmə mümkündür (`src/server/**` heç vaxt client komponentə import olunmur),
amma bu ayrılma memarlıq intizamına söykənir, strukturla təmin olunmur.
Tələb açıq şəkildə fiziki ayrılıqdır → monorepo + iki app.

### 1.4 Repo strukturu

```
yasayis/
├─ apps/
│  ├─ web/                 # Next.js — istifadəçi UI + admin panel UI
│  │  ├─ app/              # route-lar
│  │  ├─ components/       # təkrar istifadə olunan UI
│  │  ├─ features/         # domen üzrə UI modulları (listing, auth, match)
│  │  └─ lib/api-client/   # yalnız burada fetch olunur
│  └─ api/                 # NestJS
│     └─ src/modules/
│        ├─ auth/  users/  profiles/  taxonomy/
│        ├─ listings/  media/  search/
│        ├─ matching/  favorites/  contact/
│        └─ reports/  moderation/  admin/
├─ packages/
│  ├─ db/                  # Prisma schema + migrations + seed
│  ├─ shared/              # Zod sxemləri, enum-lar, tiplər, sabitlər
│  └─ config/              # eslint, tsconfig, tailwind preset
└─ docker-compose.yml
```

**Qayda:** `apps/web` heç vaxt `packages/db`-ni import etmir. Bazaya yalnız `apps/api` toxunur.

### 1.5 Backend təbəqələri (clean architecture)

```
Controller  →  Service  →  Repository  →  Prisma
   ↑             ↑             ↑
 DTO/Zod      biznes        yalnız
 validasiya   qaydaları     sorğular
```

- **Controller:** HTTP, validasiya, status kodu. Biznes məntiqi yoxdur.
- **Service:** bütün qaydalar (kim nəyi görə bilər, skor necə hesablanır, elan nə vaxt aktivləşir).
- **Repository:** Prisma sorğuları. Service heç vaxt birbaşa Prisma çağırmır.
- Domen enum və sabitləri `packages/shared`-də — hər iki tərəf eyni mənbədən oxuyur.

---

## 2. Domen modeli — əsas qərar

Platforma 3 bazar kimi göstərilir, amma məlumat baxımından **2 fərqli varlıq** var:

| Bazar | Nə elan olunur | Mahiyyət |
|---|---|---|
| Ev | Bütöv mənzil/ev | Əmlak elanı |
| Otaq | Mənzil içində otaq/yer | Əmlak elanı |
| Otaq yoldaşı | **İnsanın özü** — "mən axtarıram" | Şəxs elanı |

### 2.1 Seçilmiş yanaşma: tək `Listing` + tipli detal cədvəlləri

Bir baza cədvəli (`Listing`) + `type` diskriminatoru + hər tip üçün 1:1 detal cədvəli
(class-table inheritance).

**Üstünlüyü:** favoritlər, şikayət, əlaqə sorğusu, moderasiya, media, axtarış —
hamısı **bir dəfə** yazılır, 3 dəfə yox.

**Güzəşt:** `Listing.price` sahəsi `ROOMMATE` tipi üçün mənasızdır (orada büdcə aralığı var),
ona görə `price` nullable-dır. Bu, sənədləşdirilmiş şüurlu güzəştdir —
alternativ (3 ayrı cədvəl) hər ortaq funksiyanı 3 dəfə yazmağa məcbur edərdi.

---

## 3. Data modeli (Prisma sxemi)

### 3.1 İstifadəçi və rollar — additiv

```prisma
model User {
  id              String    @id @default(cuid())
  phone           String    @unique          // +994XXXXXXXXX
  email           String?   @unique
  passwordHash    String
  fullName        String
  avatarUrl       String?
  gender          Gender
  birthDate       DateTime?
  phoneVerifiedAt DateTime?
  status          UserStatus @default(ACTIVE)
  createdAt       DateTime  @default(now())
  deletedAt       DateTime?

  roles           UserRole[]
  studentProfile  StudentProfile?
  landlordProfile LandlordProfile?
  lifestyle       LifestyleProfile?
  listings        Listing[]
}

model UserRole {                              // additiv: bir user-də bir neçə sətir
  userId    String
  role      Role
  grantedAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@id([userId, role])
}

enum Role       { STUDENT LANDLORD MODERATOR ADMIN }
enum Gender     { MALE FEMALE }
enum UserStatus { ACTIVE SUSPENDED DELETED }
```

**Kritik qərar:** rol `User` cədvəlində `role` sütunu DEYİL — ayrı cədvəldir ki,
bir istifadəçi eyni anda həm tələbə, həm ev sahibi ola bilsin.
İcazə yoxlaması həmişə **birləşmə (union)** ilə aparılır, heç vaxt `user.role === X` ilə yox.

```prisma
model StudentProfile {
  userId       String   @id
  universityId String
  facultyId    String?
  studyYear    Int?
  bio          String?  @db.VarChar(1000)
  cityId       String                        // hazırda yaşadığı/oxuduğu şəhər
  budgetMin    Int?                          // qəpik
  budgetMax    Int?
  isVerified   Boolean  @default(false)      // admin təsdiqi (sadə)
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model LandlordProfile {
  userId      String  @id
  about       String? @db.VarChar(1000)
  isCompany   Boolean @default(false)
  companyName String?
  user        User    @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

### 3.2 Taksonomiya — admin panelindən idarə olunur, hardcoded deyil

```prisma
model City {
  id          String   @id @default(cuid())
  nameAz      String
  nameRu      String?
  slug        String   @unique              // "baki", "gence", "sumqayit"
  isActive    Boolean  @default(true)
  sortOrder   Int      @default(0)
  districts   District[]
  universities University[]
}

model District {
  id       String  @id @default(cuid())
  cityId   String
  nameAz   String
  slug     String
  isActive Boolean @default(true)
  city     City    @relation(fields: [cityId], references: [id])
  @@unique([cityId, slug])
}

model University {
  id        String  @id @default(cuid())
  cityId    String
  nameAz    String                            // "Bakı Dövlət Universiteti"
  shortName String                            // "BDU"
  slug      String  @unique
  isActive  Boolean @default(true)
  city      City    @relation(fields: [cityId], references: [id])
  faculties Faculty[]
}

model Faculty {
  id           String     @id @default(cuid())
  universityId String
  nameAz       String
  university   University @relation(fields: [universityId], references: [id])
}

model Amenity {                               // "İnternet", "Kondisioner", "Lift" ...
  id       String  @id @default(cuid())
  nameAz   String
  icon     String?
  group    String?                            // "Ev", "Otaq", "Ətraf"
  isActive Boolean @default(true)
}
```

Bakıya xas heç nə sxemə sabitlənmir. Gəncə, Sumqayıt, Mingəçevir, Naxçıvan və s.
sadəcə `City` sətirləridir — seed ilə əlavə olunur, admin panelindən idarə olunur.

### 3.3 Elanlar

```prisma
model Listing {
  id          String        @id @default(cuid())
  slug        String        @unique           // "yasamalda-2-otaqli-ev-a7f3"
  type        ListingType
  ownerId     String

  title       String        @db.VarChar(120)
  description String        @db.VarChar(4000)

  cityId      String
  districtId  String?
  addressLine String?                         // yalnız sahibi və moderator görür

  price             Int?                      // qəpik
  depositAmount     Int?
  utilitiesIncluded Boolean @default(false)
  availableFrom     DateTime?

  genderPreference GenderPreference @default(ANY)
  studentsOnly     Boolean          @default(true)

  status          ListingStatus @default(PENDING)
  rejectionReason String?
  moderatedById   String?
  moderatedAt     DateTime?

  viewCount   Int       @default(0)
  publishedAt DateTime?
  expiresAt   DateTime?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  deletedAt   DateTime?

  owner     User    @relation(fields: [ownerId], references: [id])
  images    ListingImage[]
  amenities ListingAmenity[]
  home      HomeDetails?
  room      RoomDetails?
  roommate  RoommateDetails?

  @@index([status, type, cityId, districtId, publishedAt(sort: Desc)])
  @@index([status, price])
}

enum ListingType      { HOME ROOM ROOMMATE }
enum ListingStatus    { DRAFT PENDING ACTIVE REJECTED PAUSED ARCHIVED EXPIRED }
enum GenderPreference { ANY MALE FEMALE }
```

```prisma
model HomeDetails {
  listingId    String        @id
  roomCount    Int
  area         Int?                           // m²
  floor        Int?
  totalFloors  Int?
  buildingType BuildingType?
  isFurnished  Boolean       @default(false)
  hasRepair    Boolean       @default(false)
  listing      Listing       @relation(fields: [listingId], references: [id], onDelete: Cascade)
}

model RoomDetails {
  listingId         String  @id
  roomType          RoomType                  // PRIVATE = ayrıca otaq, SHARED = otaqda yer
  placesTotal       Int     @default(1)
  placesAvailable   Int     @default(1)
  currentOccupants  Int     @default(0)
  propertyRoomCount Int?                      // mənzil neçə otaqlıdır
  isFurnished       Boolean @default(false)
  listing           Listing @relation(fields: [listingId], references: [id], onDelete: Cascade)
}

model RoommateDetails {                       // şəxs elanı — "otaq yoldaşı axtarıram"
  listingId       String    @id
  budgetMin       Int
  budgetMax       Int
  moveInDate      DateTime?
  hasPlace        Boolean   @default(false)   // "yerim var" / "birlikdə axtaraq"
  lookingForCount Int       @default(1)
  listing         Listing   @relation(fields: [listingId], references: [id], onDelete: Cascade)
  areas           RoommateArea[]              // istədiyi rayonlar
}

model RoommateArea {
  listingId  String
  districtId String
  @@id([listingId, districtId])
}

model ListingImage {
  id        String  @id @default(cuid())
  listingId String
  url       String
  thumbUrl  String
  sortOrder Int     @default(0)
  isCover   Boolean @default(false)
  width     Int
  height    Int
  listing   Listing @relation(fields: [listingId], references: [id], onDelete: Cascade)
  @@index([listingId, sortOrder])
}

model ListingAmenity {
  listingId String
  amenityId String
  @@id([listingId, amenityId])
}

enum RoomType     { PRIVATE SHARED }
enum BuildingType { NEW_BUILDING OLD_BUILDING PRIVATE_HOUSE }
```

### 3.4 Uyğunluq (lifestyle) profili

```prisma
model LifestyleProfile {
  userId           String   @id
  smoking          Smoking
  smokingTolerance Tolerance
  alcohol          Alcohol
  sleepSchedule    SleepSchedule
  cleanliness      Int                        // 1..5
  noiseTolerance   Int                        // 1..5
  guestsFrequency  Frequency
  pets             PetStatus
  cooksAtHome      Boolean
  studiesAtHome    Boolean
  genderPreference GenderPreference @default(ANY)
  updatedAt        DateTime @updatedAt
  user             User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

enum Smoking       { NO OUTSIDE_ONLY YES }
enum Tolerance     { NOT_OK NEUTRAL OK }
enum Alcohol       { NO SOCIAL YES }
enum SleepSchedule { EARLY LATE FLEXIBLE }
enum Frequency     { NEVER RARELY SOMETIMES OFTEN }
enum PetStatus     { NONE HAS_PET OK_WITH_PETS }
```

### 3.5 Qarşılıqlı əlaqə

```prisma
model Favorite {
  userId    String
  listingId String
  createdAt DateTime @default(now())
  @@id([userId, listingId])
  @@index([userId, createdAt(sort: Desc)])
}

model ContactRequest {                        // SADƏ əlaqə — chat DEYİL
  id          String        @id @default(cuid())
  listingId   String
  fromUserId  String
  toUserId    String
  message     String        @db.VarChar(500)
  status      ContactStatus @default(SENT)
  phoneShared Boolean       @default(false)
  readAt      DateTime?
  createdAt   DateTime      @default(now())
  @@unique([listingId, fromUserId])           // spam-a qarşı: 1 elana 1 sorğu
  @@index([toUserId, createdAt(sort: Desc)])
}

model Report {
  id             String       @id @default(cuid())
  listingId      String?
  reportedUserId String?
  reporterId     String
  reason         ReportReason
  comment        String?      @db.VarChar(500)
  status         ReportStatus @default(OPEN)
  resolvedById   String?
  resolutionNote String?
  createdAt      DateTime     @default(now())
  @@index([status, createdAt])
}

enum ContactStatus { SENT READ ACCEPTED DECLINED }
enum ReportReason  { FAKE_LISTING WRONG_PRICE ALREADY_RENTED SPAM OFFENSIVE OTHER }
enum ReportStatus  { OPEN REVIEWING RESOLVED DISMISSED }
```

`ContactRequest` qəsdən sadədir: bir mesaj + status. Thread, typing indicator,
real-time — bunların heç biri MVP-də yoxdur. Sahibi "qəbul et" deyəndə telefon açılır.

### 3.6 Moderasiya və audit

```prisma
model ModerationAction {
  id          String    @id @default(cuid())
  listingId   String
  moderatorId String
  action      ModAction
  reason      String?
  createdAt   DateTime  @default(now())
  @@index([listingId, createdAt])
}

model AuditLog {
  id         String   @id @default(cuid())
  actorId    String?
  action     String                           // "listing.approve", "user.suspend"
  entityType String
  entityId   String
  meta       Json?
  ip         String?
  createdAt  DateTime @default(now())
  @@index([entityType, entityId])
}

enum ModAction { APPROVE REJECT PAUSE ARCHIVE }
```

---

## 4. Uyğunluq skoru — sadə, izah oluna bilən formula

**ML yoxdur. AI yoxdur.** Çəkili orta + sərt filtrlər.

### 4.1 Sərt filtrlər (skordan əvvəl, nəticəni tamamilə kəsir)

1. Cins tərcihi uyğun gəlmirsə → nəticədə görünmür
2. Büdcə aralıqları kəsişmirsə → görünmür
3. Şəhər fərqlidirsə → görünmür
4. Elan `ACTIVE` deyilsə → görünmür

### 4.2 Skor (0–100)

| Amil | Çəki | Hesablanma |
|---|---:|---|
| Siqaret | 25 | uyğun 1.0 / dözümlü 0.5 / ziddiyyət 0.0 |
| Təmizlik | 20 | `1 - |a-b| / 4` |
| Yuxu rejimi | 15 | eyni 1.0 / biri FLEXIBLE 0.7 / əks 0.0 |
| Qonaq tezliyi | 15 | 4 pilləli şkalada normallaşdırılmış fərq |
| Səs-küy dözümü | 10 | `1 - |a-b| / 4` |
| Alkoqol | 8 | eyni 1.0 / qonşu 0.5 / əks 0.0 |
| Ev heyvanı | 7 | HAS_PET ↔ NONE = 0.0, digər hallar 1.0 |

```
skor = round( Σ(çəki_i × uyğunluq_i) / Σ(çəki_i) × 100 )
```

### 4.3 İzahlılıq (məcburi)

Hər skorun yanında **ən güclü 2 uyğunluq** və **ən zəif 1 amil** mətn kimi göstərilir:

> **84% uyğunluq** — Hər ikiniz siqaret çəkmirsiniz · Təmizlik anlayışınız yaxındır
> Fərq: siz gec, o erkən yatır

İstifadəçi rəqəmin haradan gəldiyini görməlidir. "Qara qutu" skor qadağandır.

### 4.4 Harada hesablanır

MVP-də sorğu anında SQL-də (`matching` modulu). Keş cədvəli yoxdur.
Profil sayı 50 000-i keçəndə `MatchScore` keş cədvəli əlavə olunacaq — indi yox.

---

## 5. İcazə matrisi (additiv)

Rollar bir-birini istisna etmir. Yoxlama `can(user, action, resource)` funksiyası ilə,
istifadəçinin **bütün** rollarının icazələrinin birləşməsi üzərində aparılır.

| Əməliyyat | Qonaq | Tələbə | Ev sahibi | Moderator | Admin |
|---|:--:|:--:|:--:|:--:|:--:|
| Aktiv elanlara baxmaq | ✓ | ✓ | ✓ | ✓ | ✓ |
| Axtarış / filtr | ✓ | ✓ | ✓ | ✓ | ✓ |
| Telefonu görmək | — | ✓ | ✓ | ✓ | ✓ |
| Favoritlərə əlavə | — | ✓ | ✓ | ✓ | ✓ |
| Əlaqə sorğusu göndərmək | — | ✓ | ✓ | ✓ | ✓ |
| HOME / ROOM elanı yaratmaq | — | ✓¹ | ✓ | ✓ | ✓ |
| ROOMMATE elanı yaratmaq | — | ✓ | — | ✓ | ✓ |
| Uyğunluq skorunu görmək | — | ✓ | — | ✓ | ✓ |
| Öz elanını redaktə/dayandırmaq | — | ✓ | ✓ | ✓ | ✓ |
| Şikayət göndərmək | — | ✓ | ✓ | ✓ | ✓ |
| Elanı təsdiq/rədd etmək | — | — | — | ✓ | ✓ |
| Şikayətlərə baxmaq | — | — | — | ✓ | ✓ |
| İstifadəçini bloklamaq | — | — | — | — | ✓ |
| Taksonomiyanı idarə etmək | — | — | — | — | ✓ |
| Rol vermək | — | — | — | — | ✓ |

¹ Tələbə də otaq/ev icarəyə verə bilər (subarenda). Bu halda ona `LANDLORD` rolu
əlavə olunur — `STUDENT` rolu silinmir.

---

## 6. API səthi (REST, `/api/v1`)

| Metod | Yol | Təsvir |
|---|---|---|
| POST | `/auth/register` | Qeydiyyat (telefon + parol) |
| POST | `/auth/verify-phone` | OTP təsdiqi |
| POST | `/auth/login` · `/auth/refresh` · `/auth/logout` | Sessiya |
| GET/PATCH | `/me` · `/me/student-profile` · `/me/landlord-profile` · `/me/lifestyle` | Profillər |
| GET | `/taxonomy/cities` · `/districts` · `/universities` · `/amenities` | Açıq, keşlənən |
| GET | `/listings` | Axtarış + filtr + kursor paginasiya |
| POST | `/listings` | Yaratmaq (→ `PENDING`) |
| GET/PATCH/DELETE | `/listings/:slug` | Detal / redaktə / soft delete |
| POST | `/listings/:id/images` | Şəkil yükləmə |
| GET | `/roommates` | Otaq yoldaşı elanları + uyğunluq skoru |
| GET | `/matching/:userId` | Skor + izah |
| GET/POST/DELETE | `/favorites` | Favoritlər |
| POST/GET/PATCH | `/contact-requests` | Əlaqə sorğuları |
| POST | `/reports` | Şikayət |
| GET/POST | `/admin/moderation/queue` · `/admin/moderation/:id/decision` | Moderasiya |
| CRUD | `/admin/taxonomy/*` · `/admin/users` · `/admin/reports` | Admin |

**Paginasiya:** kursor əsaslı (`?cursor=&limit=20`), `(publishedAt, id)` üzrə.
Offset paginasiya istifadə olunmur — dərin səhifələrdə yavaşdır və dublikat verir.

**Axtarış filtrləri:** `type`, `cityId`, `districtId[]`, `priceMin/Max`, `roomCount[]`,
`genderPreference`, `amenityIds[]`, `isFurnished`, `availableFrom`, `q` (mətn),
`sort` (yeni | ucuz | baha | uyğunluq).

---

## 7. Səhifə xəritəsi

**Açıq:** `/` · `/ev` · `/otaq` · `/otaq-yoldasi` · `/axtaris` · `/elan/[slug]` ·
`/profil/[id]` · `/[seher]` və `/[seher]/[rayon]` (SEO landing) · `/giris` · `/qeydiyyat`

**Panel (auth):** `/panel` · `/panel/elanlarim` · `/panel/elan/yeni` · `/panel/favoritler` ·
`/panel/sorgular` · `/panel/uygunluq` · `/panel/profil` · `/panel/ayarlar`

**Admin:** `/admin` · `/admin/moderasiya` · `/admin/elanlar` · `/admin/istifadeciler` ·
`/admin/sikayetler` · `/admin/taksonomiya`

---

## 8. Keyfiyyət standartları

- **Pul:** həmişə `Int`, qəpiklə. Float qadağandır. Göstərişdə `₼` formatlanır.
- **Validasiya:** hər endpoint-də Zod sxemi. Client validasiya yalnız UX üçündür, təhlükəsizlik deyil.
- **Şəkil:** max 10 ədəd, hər biri ≤ 5 MB, server tərəfdə WebP-yə çevrilir + thumbnail.
- **Rate limit:** login 5/dəq, OTP 3/saat, elan yaratma 5/gün, əlaqə sorğusu 20/gün.
- **Silinmə:** elan və istifadəçi üçün soft delete (`deletedAt`). Şəkillər cron ilə təmizlənir.
- **Xəta:** vahid format `{ error: { code, message, fields? } }`. Mesajlar Azərbaycan dilində.
- **Responsive:** mobile-first. Elan kartı, filtr paneli (mobildə bottom sheet), qalereya.
- **Təhlükəsizlik:** Argon2id, JWT httpOnly+SameSite, CSRF token, hər sorğuda sahiblik yoxlaması.

---

## 9. MVP sərhədi

### 9.1 v1-ə daxildir (16 funksiya)

Qeydiyyat/Giriş · Tələbə profili · Ev sahibi profili · Elan yaratma · Elan şəkilləri ·
Axtarış · Filtrlər · Elan detalları · Otaq yoldaşı profilləri · Uyğunluq skoru ·
Favoritlər · Əlaqə · Elan şikayəti · Admin panel · Elan moderasiyası · Responsive dizayn

### 9.2 v1-ə DAXİL DEYİL

AI chatbot · Onlayn ödəniş · Mürəkkəb daxili chat · Xəritə routing · Subscription ·
Tövsiyə AI-ı · Video zəng · Mürəkkəb verifikasiya · Sosial feed · Gamifikasiya

Bu siyahıdan bir şey "kiçik əlavədir" deyə MVP-yə girə bilməz.
Yeni funksiya təklifinə cavab: **v2 backlog**.

### 9.3 AI gələcəkdə harada düşünülə bilər (indi YOX)

Smart roommate matching · Elan mətninin avtomatik yazılması · Saxta elan aşkarlanması ·
Axtarış niyyətinin başa düşülməsi

---

## 10. İş sırası (4 mərhələ)

| # | Mərhələ | Nəticə |
|---|---|---|
| 1 | Bünövrə | Monorepo, Docker, Prisma sxemi + migration, seed (şəhərlər/universitetlər), dizayn tokenləri, əsas UI komponentləri |
| 2 | Şəxsiyyət | Qeydiyyat, OTP, giriş, additiv rollar, guard-lar, tələbə/ev sahibi profilləri |
| 3 | Bazar | Elan yaratma (3 tip), şəkil yükləmə, axtarış+filtr+paginasiya, elan detalı, favoritlər |
| 4 | Etibar və uyğunluq | Lifestyle anketi, uyğunluq skoru + izah, əlaqə sorğusu, şikayət, admin panel, moderasiya |

---

## 11. Açıq suallar (təsdiq lazımdır)

1. **Otaq yoldaşı ilə otaq elanı arasındakı sərhəd.** "Yerim var, yoldaş axtarıram" halı
   `ROOM` kimimi, yoxsa `ROOMMATE` (hasPlace=true) kimimi qeydə alınsın?
   *Tövsiyəm:* konkret otaq və qiymət varsa → `ROOM`; yalnız şəxs axtarışıdırsa → `ROOMMATE`.
2. **Telefonun görünməsi.** Dərhal açıq, yoxsa əlaqə sorğusu qəbul ediləndən sonra?
   *Tövsiyəm:* sorğudan sonra — saxta elan və spam zənglərə qarşı.
3. **Elan müddəti.** 30 gündən sonra avtomatik `EXPIRED`?
   *Tövsiyəm:* bəli, "uzat" düyməsi ilə.
4. **Dil.** v1 yalnız Azərbaycan dili, amma taksonomiyada `nameRu` sahələri indidən saxlanılsın?
   *Tövsiyəm:* bəli — sonra migration lazım olmasın.
