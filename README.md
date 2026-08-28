# Yaşayış

Azərbaycan tələbələri üçün yaşayış marketplace platforması.
**Tələbələr üçün daha uyğun yaşayış** — ev, otaq və otaq yoldaşı bir yerdə.

---

## Struktur

```
apps/
  web/        Next.js 15 — istifadəçi UI + admin panel
  api/        NestJS 11 — bütün biznes məntiqi, bazaya yeganə giriş
packages/
  db/         Prisma sxemi, migration-lar, seed
  shared/     Zod sxemləri, enum-lar, icazə qaydaları, uyğunluq formulu
docs/         Memarlıq sənədləri
```

**Dəyişməz qayda:** `apps/web` heç vaxt `packages/db`-ni import etmir.
Bazaya yalnız `apps/api` toxunur.

Backend təbəqələri: `Controller → Service → Repository → Prisma`.
Controller-də biznes məntiqi yoxdur, Service birbaşa Prisma çağırmır.

---

## Başlanğıc

### 1. Tələblər

- Node.js 20.11+ (test edilib: 24.x)
- npm 10+ — monorepo **npm workspaces** üzərindədir, pnpm lazım deyil
- Supabase layihəsi (managed PostgreSQL + Storage)

### 2. Mühit dəyişənləri

```bash
cp .env.example .env
```

| Dəyişən | Haradan |
|---|---|
| `DATABASE_URL` | Supabase pooler (port **6543**), `yasayis_app` rolu ilə |
| `DIRECT_URL` | Eyni pooler, port **5432** |
| `SUPABASE_PROJECT_REF` | Layihə ref-i — miqrasiya skripti işlədir |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API |
| `SUPABASE_ACCESS_TOKEN` | Hesab səviyyəli token — YALNIZ miqrasiya üçün |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` | `openssl rand -base64 48` |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google Cloud Console → Credentials → OAuth client ID (Web) |

### Baza rolları

İki ayrı səlahiyyət var və bu, şüurlu qərardır:

| Rol | Nə edir | Harada |
|---|---|---|
| `yasayis_app` | Yalnız data: SELECT, INSERT, UPDATE, DELETE | `DATABASE_URL` — işlək tətbiq |
| `postgres` | Sxem dəyişiklikləri (DDL) | Management API — `db:migrate:remote` |

İşlək tətbiq heç vaxt cədvəl yarada və ya dəyişə bilməz. Sxem dəyişəndə:

```bash
npm run db:migrate:remote:dry   # yalnız SQL-i göstərir
npm run db:migrate:remote       # tətbiq edir və tarixçəyə yazır
```

`.env` heç vaxt commit olunmur. Token və ya açar mesajda paylaşılıbsa,
onu panelindən **revoke edin** və yenisini yaradın.

Konfiqurasiya açılışda Zod ilə yoxlanılır — yanlış dəyər varsa API işə düşmür
və hansı dəyişənin problemli olduğunu dəqiq yazır.

### 3. Quraşdırma və baza

```bash
npm install
npm run build --workspace=@yasayis/shared   # ortaq paket TS → JS
npm run db:generate                          # Prisma client
npm run db:seed                              # şəhərlər, rayonlar, universitetlər, ixtisaslar
```

Sxem Supabase-ə artıq tətbiq olunub (30 cədvəl, 23 enum). Vəziyyəti yoxlamaq:

```bash
npx prisma migrate status --schema packages/db/prisma/schema.prisma
```

Admin hesabı seed zamanı `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` dəyərlərindən
yaradılır. Seed **idempotentdir**, amma mövcud hesabın PAROLUNU dəyişmir —
yalnız `isAdmin` bayrağını qaldırır. Parolu dəyişmək üçün profil səhifəsindəki
"Parolu dəyiş" bölməsindən istifadə edin.

### Admin panelinə giriş

`/admin` ünvanı **gizli deyil, amma reklam da olunmur**: heç bir menyuda linki
yoxdur, sitemap-a düşmür, `robots.txt`-də bağlıdır və admin olmayan istifadəçi
ünvanı yazanda izahlı ekran yox, birbaşa **ana səhifəyə** yönləndirilir.

Bu, təhlükəsizlik sərhədi deyil — sərhəd serverdədir: hər admin endpoint-i
`@RequireAbility` ilə qorunur və admin olmayan sessiyaya heç bir data qaytarmır.
Yönləndirmə yalnız panelin varlığını üzə çıxarmamaq üçündür.

Sistemdə **bir dənə** admin hesabı olmalıdır. Adminləri yoxlamaq:

```bash
npx prisma studio --schema packages/db/prisma/schema.prisma   # users → is_admin
```

### 4. İşə salmaq

```bash
npm run dev:api          # http://localhost:4000/api/v1
npm run dev:web          # http://localhost:3000
```

Yoxlama: `curl http://localhost:4000/api/v1/health`

Dev rejimində baza qoşulmasa da API qalxır və `/health` `"degraded"` qaytarır —
prod-da isə yanlış konfiqurasiya ilə start etmir.

---

## Hazır olan API

### Autentifikasiya — additiv rollar
`is_student`, `is_owner`, `is_admin` ayrı-ayrı bool sahələrdir və bir-birini
istisna etmir. İcazə yoxlaması heç vaxt "rolu nədir" sualı ilə deyil,
`can(user, ability)` ilə aparılır.

| | |
|---|---|
| `POST /auth/register` | E-poçt + parol |
| `POST /auth/login` | E-poçt + parol |
| `GET /auth/google/url` · `POST /auth/google` | Google OAuth |
| `POST /auth/otp/request` | SMS kod göndərir |
| `POST /auth/phone/verify` | Nömrəni təsdiqləyir |
| `POST /auth/phone/login` | Parolsuz giriş |
| `POST /auth/password/change` · `/password/reset` | Parol |
| `GET /auth/me` · `POST /auth/refresh` · `/logout` | Sessiya |
| `POST /auth/roles` | İkinci rolu açır/bağlayır |
| `POST /auth/onboarding/complete` | Onboarding sonu |

Sessiya web tərəfdə AVTOMATİK uzadılır: access token 15 dəqiqəlikdir və 401
gələndə `lib/api-client` bir dəfə `/auth/refresh` çağırıb sorğunu təkrarlayır.

### Taksonomiya — oxuma açıq, yazma admin
`GET /taxonomy/cities · districts · universities · majors`
`GET|POST|PATCH|DELETE /admin/taxonomy/{cities|districts|universities|majors}`

Şəhər/rayon/universitet/ixtisas kodda sabitlənmir — yeni şəhər əlavə etmək
üçün deploy lazım deyil.

### Elanlar
`GET /listings` (axtarış) · `GET /listings/:slug` · `POST /listings`
`PATCH /listings/:id` — redaktə; status dəyişmir
`POST /listings/:id/renew · /expire · /contact`
`POST|PATCH|DELETE /listings/:id/images[/:imageId]` — əlavə, sıralama, silmə

**Moderasiya ÖNCƏDƏN deyil, SONRADANDIR.** Yeni elan dərhal `ACTIVE` olur —
moderator təsdiqi gözlənilmir. Səbəb: ilk mərhələdə elan sayı azdır və hər elanı
bir iş günü növbədə saxlamaq platformanı ev sahibi üçün yararsız edir.

Nəzarət aradan qalxmır, yerini dəyişir:

* elan qaydalara uyğun deyilsə admin onu **dayandırır** (`SUSPEND`) və ya **silir**;
* dayandırılmış elanı yalnız admin geri qaytara bilər — sahibi `renew` ilə
  keçə bilmir;
* şikayət axını (`POST /reports`) dəyişməz qalır və admin panelindəki
  "Şikayətlər" bölməsinə düşür.

Elan `ACTIVE` olsa da ən azı bir şəkil yüklənənə qədər ictimai siyahılarda
GÖRÜNMÜR. Saxlanmış axtarışlara bildiriş də məhz ilk şəkil əlavə olunanda
göndərilir — yoxsa istifadəçi boş elana yönləndirilərdi.

### Profil, təsdiq və bildirişlər
`GET|PATCH /me/student-profile · /me/owner-profile · /me/roommate-profile`
`GET /me/verifications` · `POST /me/verifications` — tələbə/ev sahibi təsdiqi üçün müraciət
`GET /admin/verifications/pending` · `POST /admin/verifications/:userId/:type` — admin qərarı
`GET /me/notifications` · `/unread-count` · `POST /me/notifications/:id/read` · `/read-all`

**Telefon təsdiqi qapı rolundadır:** otaq yoldaşı profili `visible: true` ola
bilməz, nömrə təsdiqlənməyibsə. Qayda serverdədir, client-in göndərdiyi dəyər
kifayət etmir.

---

## Əmrlər

| Əmr | Nə edir |
|---|---|
| `npm run build` | Bütün paketləri qurur |
| `npm run typecheck` | Tip yoxlaması (bütün workspace-lər) |
| `npm run lint` | ESLint — bütün repo, xəbərdarlıq da xəta sayılır |
| `npm run lint:fix` | Avtomatik düzələnləri düzəldir |
| `npm run test` | Vitest — uyğunluq formulunun testləri |
| `npm run db:studio` | Prisma Studio — bazaya vizual baxış |
| `npm run db:push` | Sxemi migration yaratmadan tətbiq edir (yalnız dev) |
| `npm run db:seed` | Taksonomiya (şəhər, rayon, universitet, ixtisas) |
| `npm run db:seed:demo` | Nümunə ev sahibi, 6 elan və 4 tələbə profili — **yalnız dev** |
| `npm run db:seed:demo -- --temizle` | Nümunə hesabları və onlara bağlı hər şeyi silir |

### Buraxılışdan əvvəl

```bash
npm run lint && npm run typecheck && npm run test && npm run build
```

Dördü də təmiz keçməlidir. `next build` lint-i təkrarlamır — yoxlama yuxarıdakı
ayrıca əmrlə, bütün repo üçün bir dəfə aparılır.

`packages/shared` dəyişəndən sonra onu yenidən qurun:
`npm run dev --workspace=@yasayis/shared` (watch rejimi).

---

## MVP sərhədi

**v1-ə daxildir:** Qeydiyyat/Giriş · Tələbə profili · Ev sahibi profili ·
Elan yaratma · Elan şəkilləri · Axtarış · Filtrlər · Elan detalları ·
Otaq yoldaşı profilləri · Uyğunluq skoru · Favoritlər · Əlaqə · Elan şikayəti ·
Admin panel · Elan moderasiyası · Responsive dizayn

**v1-ə daxil DEYİL:** AI chatbot · Onlayn ödəniş · Mürəkkəb daxili chat ·
Xəritə routing · Subscription · Tövsiyə AI-ı · Video zəng · Mürəkkəb verifikasiya ·
Sosial feed · Gamifikasiya

Bu siyahıdan bir şey "kiçik əlavədir" deyə MVP-yə girmir.

---

## Vəziyyət

- [x] **A1** — Verilənlər bazası sxemi (`packages/db/prisma/schema.prisma`)
- [x] **A2** — Taksonomiya CRUD API + seed data
- [x] **A3** — Autentifikasiya, additiv rollar, OTP, Google OAuth
- [x] Dizayn tokenləri, loqo, əsas UI komponentləri
- [x] **Supabase qoşuldu** — sxem tətbiq olunub, seed işləyib, storage bucket hazırdır
- [x] **C1** — Onboarding axını
- [x] **D** — Elan yaratma, redaktə, axtarış, filtrlər, şəkil idarəsi
- [x] **E** — Uyğunluq skoru
- [x] **F** — Profil, nişanlar və təsdiq axını
- [x] **G** — Admin panel, moderasiya və təsdiq növbəsi
- [x] **I2** — Bildirişlər (in-app siyahı + başlıqdakı sayğac)

### Qəsdən v1-dən kənarda qalanlar

Bunlar **işləmir deyil, YOXDUR** — MVP sərhədinin o tayındadır:

* Real e-poçt provayderi. `EMAIL_PROVIDER=console` ilə mesaj log-a yazılır;
  `http` seçilsə inteqrasiya olmadığı üçün göndərilmir və xəbərdarlıq log-a düşür.
* Real SMS provayderi. Eyni məntiq: `SMS_PROVIDER=console`, kod log-dadır.
* Google OAuth açarları `.env`-də boşdur. Bu halda `GET /auth/google/url`
  `configured: false` qaytarır və düymə ekranda ÜMUMİYYƏTLƏ görünmür —
  işləməyən düymə göstərmirik.
* Təsdiq üçün sənəd yükləmə. İstifadəçi sübut linki verir, admin kənar kanalla
  yoxlayır.
* `/elaqe` səhifəsində forma yoxdur — gələn müraciəti oxuyacaq daxili sistem
  qurulmayıb, ona görə e-poçt ünvanı göstərilir.

---

## Təhlükəsizlik

### Tətbiq edilmiş nəzarətlər

| Sahə | Nəzarət |
|---|---|
| Parol | argon2id; girişdə istifadəçi tapılmasa da yoxlama işlədilir (vaxt kanalı bağlıdır) |
| Sessiya | httpOnly + Secure cookie; `COOKIE_SAMESITE` yerləşdirməyə görə qurulur |
| OTP | Yalnız hash saxlanılır, sabit vaxtlı müqayisə, 5 cəhd, saatda 3 kod |
| İcazələr | Qlobal `AuthGuard` + endpoint səviyyəsində `@RequireAbility`; sahiblik hər əməliyyatda yoxlanılır |
| Şəxsi məlumat | Dəqiq ünvan yalnız sahibinə; telefon elan cavabında ÜMUMİYYƏTLƏ gəlmir |
| Telefon | Ayrıca `POST /listings/:id/contact` — gündə 20 elan, hər açılış `ContactEvent` kimi qeydə düşür |
| Şəkil yükləmə | Formatı dekoder təsdiqləyir (client `Content-Type`-ı yox), 50 MP limiti, WebP-yə yenidən kodlama, EXIF silinməsi, SVG qadağan |
| Fayl yolu | `uploads/` sərhədi açıq yoxlanılır (path traversal) |
| Başlıqlar | CSP, HSTS (prod), Permissions-Policy, `X-Frame-Options`, `nosniff`, `Referrer-Policy` |
| Sürət limiti | Qlobal 120/dəq + login, OTP, elan yaratma və əlaqə üçün ayrıca limitlər |
| Xəta cavabları | Stack və SQL heç vaxt cavaba düşmür; girişdə e-poçt sayımına imkan verən fərqli mesaj yoxdur |

### `npm audit` haqqında

Qalan xəbərdarlıqlar **yalnız build vaxtı** işləyən paketlərə aiddir və
istehsalat sorğu yolunda deyil:

* **postcss** (`next` daxilində) — CSS-i yalnız `next build` emal edir və
  mənbə bizim öz faylımızdır. Düzəlişi `next@16`-dır (major keçid).
* **deepmerge-ts** (`@prisma/config` daxilində) — `prisma` CLI-si
  `devDependency`-dir, istehsalata ümumiyyətlə düşmür.

İstifadəçi girişini emal edən paketlər yenilənib: `sharp` 0.35.4 (libvips
CVE-ləri), `vitest` 3.x.
