'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  GraduationCap,
  Home,
  LogOut,
  Mail,
  Phone,
  Plus,
  UserRound,
} from 'lucide-react';
import {
  formatBudgetRange,
  formatDate,
  formatPhone,
  genderPreferenceLabels,
  lifestyleLabels,
  listingStatusLabels,
  lookingForLabels,
  petsAttitudeLabels,
  smokingHabitLabels,
  type MyListingDto,
  type OwnStudentProfileDto,
  type PrivacyField,
  type ProfileOverviewDto,
} from '@yasayis/shared';
import { api } from '@/lib/api-client';
import { resetFavorites } from '@/lib/favorites';
import { NoOwnListings } from '@/components/empty/empty-state';
import { Badge, VerificationRow, VerifiedBadge } from '@/components/ui/badge';
import { Button, ButtonLink } from '@/components/ui/button';
import { Card, Panel, Skeleton, Well } from '@/components/ui/card';
import { cn } from '@/lib/cn';
import { FieldRow } from './field-row';
import { MyListingActions } from './my-listing-actions';
import { OwnerProfileForm } from './owner-profile-form';
import { PasswordCard } from './password-card';
import { PhoneCard } from './phone-card';
import { RoommateVisibility } from './roommate-visibility';

/**
 * Vahid profil görünüşü.
 *
 * Rollar ADDİTİVDİR: bir istifadəçi həm tələbə, həm ev sahibi ola bilər. Bu halda
 * səhifə iki bölmə arasında tab ilə keçid verir — ayrıca hesab yaratmağa,
 * çıxıb yenidən girməyə ehtiyac yoxdur. Rol aktiv deyilsə, onu bir düymə ilə
 * açmaq təklif olunur.
 */

type Tab = 'student' | 'owner';

export function ProfileView() {
  const [data, setData] = useState<ProfileOverviewDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('student');
  const [pendingField, setPendingField] = useState<string | null>(null);
  const [roleBusy, setRoleBusy] = useState(false);

  /**
   * Səhifənin bütün məlumatı bir sorğudan gəlir, ona görə hər dəyişiklikdən
   * sonra onu bütöv oxuyuruq. Telefon təsdiqi kimi hadisələr eyni anda bir
   * neçə yeri dəyişir (nişan, otaq yoldaşı görünürlüyü, sessiya bayrağı) —
   * yerli olaraq yamamaq bu yerlərdən birini köhnə qoyardı.
   */
  const reload = useCallback(async () => {
    await api
      .get<ProfileOverviewDto>('/me/overview')
      .then(setData)
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    let cancelled = false;

    api
      .get<ProfileOverviewDto>('/me/overview')
      .then((res) => {
        if (cancelled) return;
        setData(res);
        setTab(res.user.isStudent ? 'student' : 'owner');
      })
      .catch(() => {
        /*
          Giriş yoxdursa `data` NULL qalır və `SignInPrompt` göstərilir.

          Əvvəl burada nümunə profil (`DEMO_OVERVIEW`) yüklənirdi. Bu, digər
          ekranlardakı nümunə datadan PRİNSİPCƏ fərqlidir: orada boş bazada
          nümunə ELAN göstərilir (ictimai məzmun), burada isə giriş etməmiş
          adama uydurma ŞƏXSİ profil göstərilirdi — başqasının adı, universiteti,
          büdcəsi. İstifadəçi öz hesabına baxdığını zənn edir, "Cavabları dəyiş"
          düyməsinə basır, heç nə saxlanmır.

          Şəxsi səhifədə düzgün cavab birdir: daxil ol.
        */
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  /** Görünürlük açarı — optimist yenilənir, xəta olsa geri qaytarılır. */
  const togglePrivacy = useCallback(
    async (field: PrivacyField, next: boolean) => {
      if (!data?.student) return;
      const previous = data.student.privacy[field];

      setPendingField(field);
      setData((d) =>
        d?.student
          ? { ...d, student: { ...d.student, privacy: { ...d.student.privacy, [field]: next } } }
          : d,
      );

      try {
        await api.patch('/me/student-profile/privacy', { [field]: next });
      } catch {
        setData((d) =>
          d?.student
            ? {
                ...d,
                student: {
                  ...d.student,
                  privacy: { ...d.student.privacy, [field]: previous },
                },
              }
            : d,
        );
      }

      setPendingField(null);
    },
    [data],
  );

  /** İkinci rolu açmaq — ayrıca qeydiyyat yoxdur. */
  const enableRole = async (role: 'isStudent' | 'isOwner') => {
    setRoleBusy(true);
    await api.post('/auth/roles', { [role]: true }).catch(() => undefined);
    await reload();
    setRoleBusy(false);
    setTab(role === 'isOwner' ? 'owner' : 'student');
  };

  if (loading) return <ProfileSkeleton />;
  if (!data) return <SignInPrompt />;

  const { user, verifications, student, owner, listings } = data;
  const bothRoles = user.isStudent && user.isOwner;

  return (
    <div className="flex flex-col gap-5">
      <ProfileHeader
        user={user}
        verifications={verifications}
        onEnableRole={enableRole}
        roleBusy={roleBusy}
      />

      {bothRoles && <RoleTabs tab={tab} onChange={setTab} listingCount={listings.length} />}

      {(!bothRoles || tab === 'student') && user.isStudent && student && (
        <>
          <StudentSection
            profile={student}
            onTogglePrivacy={togglePrivacy}
            pendingField={pendingField}
          />

          <RoommateVisibility phoneVerified={verifications.phone} />
        </>
      )}

      {(!bothRoles || tab === 'owner') && user.isOwner && owner && (
        <OwnerSection
          owner={owner}
          user={user}
          verifications={verifications}
          listings={listings}
          onChanged={() => void reload()}
        />
      )}

      {/* Hesab bölməsi rollardan asılı deyil — hər iki tabda eyni yerdədir. */}
      <PhoneCard
        phone={user.phone}
        verified={verifications.phone}
        onVerified={() => void reload()}
      />
      <PasswordCard />
      <AccountActions />
    </div>
  );
}

/**
 * Hesab əməliyyatları — hazırda yalnız çıxış.
 *
 * Səhifənin ƏN ALTINDADIR və `tertiary` düymədir: çıxış gündəlik iş deyil,
 * yuxarıda duranda isə səhvən basılır. Profilə baxmağa gələn adam əvvəlcə
 * profilini görməlidir.
 */
function AccountActions() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const logout = async () => {
    setBusy(true);
    // Xəta olsa belə davam edirik: sessiya serverdə onsuz da etibarsızdır və
    // istifadəçini "çıxa bilmirsiniz" ekranında saxlamaq daha pisdir.
    await api.post('/auth/logout').catch(() => undefined);
    // Favorit store-u sıfırlanır, yoxsa növbəti istifadəçi əvvəlkinin
    // saxladıqlarını dolu ürək kimi görür.
    resetFavorites();
    router.replace('/');
    router.refresh();
  };

  return (
    <Panel className="flex flex-wrap items-center justify-between gap-3 p-5">
      <div>
        <p className="text-h3 text-stone-900">Hesabdan çıx</p>
        <p className="mt-1 text-sm text-stone-600">
          Bu cihazda sessiyan bağlanacaq. Saxladıqların hesabında qalır.
        </p>
      </div>

      <Button variant="tertiary" loading={busy} onClick={logout}>
        <LogOut className="size-4" aria-hidden />
        Çıxış
      </Button>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// Başlıq
// ---------------------------------------------------------------------------

function ProfileHeader({
  user,
  verifications,
  onEnableRole,
  roleBusy,
}: {
  user: ProfileOverviewDto['user'];
  verifications: ProfileOverviewDto['verifications'];
  onEnableRole: (role: 'isStudent' | 'isOwner') => void;
  roleBusy: boolean;
}) {
  return (
    <Panel className="p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="relative size-20 shrink-0 overflow-hidden rounded-full bg-stone-100">
          {user.avatarUrl ? (
            <Image src={user.avatarUrl} alt="" fill sizes="80px" className="object-cover" />
          ) : (
            <span className="flex h-full items-center justify-center text-stone-400">
              <UserRound className="size-9" strokeWidth={1.5} aria-hidden />
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h1 className="text-h2 text-stone-900">{user.fullName}</h1>
          <p className="mt-0.5 text-sm text-stone-500">
            {formatDate(user.memberSince)} tarixindən üzvdür
          </p>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {user.isStudent && <Badge tone="accent" icon={GraduationCap}>Tələbə</Badge>}
            {user.isOwner && <Badge tone="accent" icon={Home}>Ev sahibi</Badge>}
            {verifications.phone && <VerifiedBadge kind="phone" />}
          </div>
        </div>
      </div>

      {/* Rollar additivdir: olmayan rol bir düymə ilə açılır, yeni hesab lazım deyil. */}
      {(!user.isStudent || !user.isOwner) && (
        <Well className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
          <p className="min-w-0 flex-1 text-sm text-stone-700">
            {!user.isOwner
              ? 'Otağını və ya evini kirayə vermək istəyirsən? Ev sahibi rolunu aç — tələbə profilin olduğu kimi qalır.'
              : 'Özün üçün yaşayış axtarırsan? Tələbə rolunu aç — ev sahibi profilin olduğu kimi qalır.'}
          </p>
          <Button
            size="sm"
            variant="secondary"
            loading={roleBusy}
            onClick={() => onEnableRole(user.isOwner ? 'isStudent' : 'isOwner')}
          >
            {user.isOwner ? 'Tələbə rolunu aç' : 'Ev sahibi rolunu aç'}
          </Button>
        </Well>
      )}
    </Panel>
  );
}

function RoleTabs({
  tab,
  onChange,
  listingCount,
}: {
  tab: Tab;
  onChange: (t: Tab) => void;
  listingCount: number;
}) {
  const tabs: { id: Tab; label: string; icon: typeof GraduationCap; count?: number }[] = [
    { id: 'student', label: 'Tələbə profili', icon: GraduationCap },
    { id: 'owner', label: 'Ev sahibi', icon: Home, count: listingCount },
  ];

  return (
    <div
      role="tablist"
      aria-label="Profil bölmələri"
      className="flex gap-1 rounded-[var(--radius-input)] bg-stone-100 p-1 ring-1 ring-stone-200/70"
    >
      {tabs.map((t) => {
        const active = tab === t.id;
        const Icon = t.icon;
        return (
          <button
            key={t.id}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.id)}
            className={cn(
              'flex flex-1 items-center justify-center gap-2 rounded-[0.55rem] px-3 py-2.5 text-body font-semibold transition-colors',
              active
                ? 'bg-white text-forest-700 shadow-[var(--shadow-xs)] ring-1 ring-stone-200/70'
                : 'text-stone-600 hover:text-forest-700',
            )}
          >
            <Icon className="size-4 shrink-0" aria-hidden />
            {t.label}
            {t.count !== undefined && t.count > 0 && (
              <span
                className={cn(
                  'tabular rounded-full px-1.5 text-2xs',
                  active ? 'bg-white/20' : 'bg-stone-200 text-stone-600',
                )}
              >
                {t.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tələbə bölməsi
// ---------------------------------------------------------------------------

function StudentSection({
  profile,
  onTogglePrivacy,
  pendingField,
}: {
  profile: OwnStudentProfileDto;
  onTogglePrivacy: (field: PrivacyField, next: boolean) => void;
  pendingField: string | null;
}) {
  const p = profile.privacy;

  const row = (
    label: string,
    value: React.ReactNode,
    field: PrivacyField,
  ): React.ReactNode => (
    <FieldRow
      key={field}
      label={label}
      value={value}
      isPublic={p[field]}
      pending={pendingField === field}
      onTogglePrivacy={(next) => onTogglePrivacy(field, next)}
    />
  );

  return (
    <Panel className="p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-h3 text-stone-900">Tələbə profili</h2>
        <ButtonLink href="/basla" size="sm" variant="tertiary">
          Cavabları dəyiş
        </ButtonLink>
      </div>

      {!profile.isComplete && (
        <Well className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <p className="min-w-0 flex-1 text-sm text-stone-700">
            Profil yarımçıqdır — uyğunluq skoru yalnız tam profillər üçün hesablanır.
          </p>
          <ButtonLink href="/basla" size="sm">
            Tamamla
          </ButtonLink>
        </Well>
      )}

      <div className="mt-2 divide-y divide-stone-200/70">
        <FieldRow
          label="Şəhər"
          value={profile.cityName}
          locked
          lockedReason="Axtarış və uyğunluq hesablaması şəhərə görə işləyir."
        />
        {row('Universitet', profile.universityName, 'universityIsPublic')}
        {row('İxtisas', profile.majorName, 'majorIsPublic')}
        {row('Haqqında', profile.bio, 'bioIsPublic')}
        {row(
          'Büdcə',
          profile.budgetMin != null && profile.budgetMax != null
            ? formatBudgetRange(profile.budgetMin, profile.budgetMax)
            : null,
          'budgetIsPublic',
        )}
        {row(
          'Yaşayış üstünlüyü',
          profile.lifestyle ? lifestyleLabels[profile.lifestyle] : null,
          'lifestyleIsPublic',
        )}
        {row(
          'Siqaret',
          profile.smoking ? smokingHabitLabels[profile.smoking] : null,
          'smokingIsPublic',
        )}
        {row(
          'Ev heyvanları',
          profile.petsAttitude ? petsAttitudeLabels[profile.petsAttitude] : null,
          'petsAttitudeIsPublic',
        )}
        {row(
          'Cins üstünlüyü',
          profile.genderPreference
            ? genderPreferenceLabels[profile.genderPreference]
            : null,
          'genderPreferenceIsPublic',
        )}
        {row(
          'Axtardığı',
          profile.lookingFor ? lookingForLabels[profile.lookingFor] : null,
          'lookingForIsPublic',
        )}
      </div>

      <p className="mt-4 text-2xs leading-relaxed text-stone-500">
        Gizli sahələr başqalarının gördüyü profildə ümumiyyətlə görünmür, amma
        uyğunluq skorunun hesablanmasında iştirak edir.
      </p>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// Ev sahibi bölməsi
// ---------------------------------------------------------------------------

function OwnerSection({
  owner,
  user,
  verifications,
  listings,
  onChanged,
}: {
  owner: NonNullable<ProfileOverviewDto['owner']>;
  user: ProfileOverviewDto['user'];
  verifications: ProfileOverviewDto['verifications'];
  listings: MyListingDto[];
  onChanged: () => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      <Panel className="p-5 sm:p-6">
        <h2 className="text-h3 text-stone-900">Ev sahibi profili</h2>

        <div className="mt-2 divide-y divide-stone-200/70">
          <FieldRow
            label="Ad / şirkət"
            value={owner.isCompany ? owner.companyName : user.fullName}
          />
          <FieldRow
            label="E-poçt"
            value={
              user.email ? (
                <span className="flex min-w-0 items-center gap-2">
                  <Mail className="hidden size-3.5 shrink-0 text-stone-400 sm:block" aria-hidden />
                  <span className="truncate">{user.email}</span>
                </span>
              ) : null
            }
          />
          <FieldRow
            label="Telefon"
            value={
              user.phone ? (
                <span className="flex min-w-0 items-center gap-2">
                  <Phone className="hidden size-3.5 shrink-0 text-stone-400 sm:block" aria-hidden />
                  <span className="tabular truncate">{formatPhone(user.phone)}</span>
                  {verifications.phone && (
                    <span className="shrink-0">
                      <VerifiedBadge kind="phone" />
                    </span>
                  )}
                </span>
              ) : null
            }
          />
          <FieldRow
            label="Şirkət"
            value={owner.isCompany ? (owner.companyName ?? 'Şirkət adı yazılmayıb') : null}
          />
          <FieldRow label="Haqqında" value={owner.about} />
        </div>

        <div className="mt-4">
          <OwnerProfileForm owner={owner} onSaved={onChanged} />
        </div>

        {/*
          Ev sahibi təsdiqi ÇIXARILIB. Mülkiyyət sənədini uzaqdan yoxlamağın
          etibarlı yolu yoxdur: göndərilən şəkil kimin olduğunu sübut etmir və
          "təsdiqlənmiş ev sahibi" nişanı tələbədə yanlış təhlükəsizlik hissi
          yaradır. Nəzarət şikayət və moderasiya üzərindən gedir.

          Telefon təsdiqi qalır — o, avtomatikdir və doğrudan yoxlanılır.
        */}
        <div className="mt-4">
          <VerificationRow kind="phone" verified={verifications.phone} />
        </div>
      </Panel>

      <Panel className="p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-h3 text-stone-900">
            Elanlarım
            {owner.listingCount > 0 && (
              <span className="ml-2 text-body font-medium text-stone-500">
                {owner.activeListingCount} aktiv / {owner.listingCount}
              </span>
            )}
          </h2>
          <ButtonLink href="/elan/yeni" size="sm">
            <Plus className="size-4" aria-hidden />
            Elan yerləşdir
          </ButtonLink>
        </div>

        {listings.length === 0 ? (
          <NoOwnListings className="mt-4" />
        ) : (
          <ul className="mt-4 flex flex-col gap-3">
            {listings.map((l) => (
              <li key={l.id}>
                <MyListingRow listing={l} onChanged={onChanged} />
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

function MyListingRow({
  listing,
  onChanged,
}: {
  listing: MyListingDto;
  onChanged: () => void;
}) {
  const tone =
    listing.status === 'ACTIVE'
      ? 'accent'
      : listing.status === 'REJECTED' || listing.status === 'SUSPENDED'
        ? 'danger'
        : listing.status === 'PENDING'
          ? 'warning'
          : 'neutral';

  return (
    <Card className="flex gap-3 p-3">
      <div className="relative size-20 shrink-0 overflow-hidden rounded-[0.6rem] bg-stone-100">
        {listing.coverImageUrl && (
          <Image
            src={listing.coverImageUrl}
            alt=""
            fill
            sizes="80px"
            className="object-cover"
          />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <p className="min-w-0 truncate text-body font-semibold text-stone-900">
            {listing.title}
          </p>
          <Badge tone={tone}>{listingStatusLabels[listing.status]}</Badge>
        </div>
        <p className="mt-0.5 truncate text-sm text-stone-500">
          {listing.districtName
            ? `${listing.districtName}, ${listing.cityName}`
            : listing.cityName}
          {' · '}
          {listing.roomCount} otaq
        </p>
        {listing.rejectionReason && (
          <p className="mt-1 text-sm text-danger-600">{listing.rejectionReason}</p>
        )}
        <p className="mt-1 text-2xs text-stone-400">{listing.viewCount} baxış</p>

        <MyListingActions listing={listing} onChanged={onChanged} />
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------

function ProfileSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      <Panel className="flex gap-4 p-6">
        <Skeleton className="size-20 rounded-full" />
        <div className="flex-1 space-y-2.5">
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-6 w-2/3" />
        </div>
      </Panel>
      <Panel className="space-y-4 p-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-12" />
        ))}
      </Panel>
    </div>
  );
}

function SignInPrompt() {
  return (
    <Panel className="flex flex-col items-center px-6 py-14 text-center">
      <span
        aria-hidden
        className="grid size-14 place-items-center rounded-full bg-sprout-100 text-forest-600"
      >
        <UserRound className="size-6" strokeWidth={1.75} />
      </span>
      <h1 className="mt-5 text-h3 text-stone-900">Profilini görmək üçün daxil ol</h1>
      <p className="mt-2 max-w-sm text-body text-stone-600">
        Hesabın yoxdursa, bir neçə dəqiqədə qeydiyyatdan keçə bilərsən.
      </p>
      <div className="mt-6 flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
        <ButtonLink href="/giris">Daxil ol</ButtonLink>
        <ButtonLink href="/qeydiyyat" variant="tertiary">
          Qeydiyyatdan keç
        </ButtonLink>
      </div>
    </Panel>
  );
}
