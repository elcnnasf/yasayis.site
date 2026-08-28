/**
 * İcazə sistemi — ADDİTİV.
 *
 * Rollar bool bayraqlardır və bir-birini istisna etmir: `isStudent` və `isOwner`
 * eyni anda true ola bilər. Ona görə icazə heç vaxt "istifadəçinin rolu nədir"
 * sualı ilə hesablanmır — aktiv olan bütün bayraqların icazələri BİRLƏŞDİRİLİR.
 *
 * Sahiblik (öz elanını redaktə etmək kimi) burada deyil, service təbəqəsində
 * yoxlanılır: bu fayl yalnız "bu rol ümumiyyətlə bunu edə bilərmi" sualına cavab verir.
 */

export interface ActorRoles {
  isStudent: boolean;
  isOwner: boolean;
  isAdmin: boolean;
}

export const GUEST: ActorRoles = { isStudent: false, isOwner: false, isAdmin: false };

export const Ability = {
  LISTING_VIEW: 'listing:view',
  LISTING_SEARCH: 'listing:search',
  LISTING_CREATE: 'listing:create',
  LISTING_MANAGE_OWN: 'listing:manage-own',
  LISTING_MODERATE: 'listing:moderate',

  PROPERTY_MANAGE_OWN: 'property:manage-own',

  ROOMMATE_PROFILE_MANAGE: 'roommate:manage',
  ROOMMATE_BROWSE: 'roommate:browse',
  MATCH_VIEW: 'match:view',

  CONTACT_VIEW_PHONE: 'contact:view-phone',
  /** Daxili mesaj göndərmək və oxumaq. */
  MESSAGE_SEND: 'message:send',

  FAVORITE_MANAGE: 'favorite:manage',
  SEARCH_ALERT_MANAGE: 'search-alert:manage',

  REPORT_CREATE: 'report:create',
  REPORT_REVIEW: 'report:review',

  USER_SUSPEND: 'user:suspend',
  VERIFICATION_REVIEW: 'verification:review',
  TAXONOMY_MANAGE: 'taxonomy:manage',
  ADMIN_PANEL: 'admin:panel',
} as const;
export type Ability = (typeof Ability)[keyof typeof Ability];

/** Giriş etməmiş ziyarətçi — yalnız oxuya bilər. */
const GUEST_ABILITIES: readonly Ability[] = [Ability.LISTING_VIEW, Ability.LISTING_SEARCH];

/** Hər giriş etmiş istifadəçi, rolundan asılı olmayaraq. */
const AUTHENTICATED_ABILITIES: readonly Ability[] = [
  ...GUEST_ABILITIES,
  Ability.CONTACT_VIEW_PHONE,
  Ability.MESSAGE_SEND,
  Ability.FAVORITE_MANAGE,
  Ability.SEARCH_ALERT_MANAGE,
  Ability.REPORT_CREATE,
];

const STUDENT_ABILITIES: readonly Ability[] = [
  Ability.ROOMMATE_PROFILE_MANAGE,
  Ability.ROOMMATE_BROWSE,
  Ability.MATCH_VIEW,
];

const OWNER_ABILITIES: readonly Ability[] = [
  Ability.PROPERTY_MANAGE_OWN,
  Ability.LISTING_CREATE,
  Ability.LISTING_MANAGE_OWN,
];

const ADMIN_ABILITIES: readonly Ability[] = Object.values(Ability);

/**
 * Aktiv bayraqların icazələrinin birləşməsi.
 *
 * Tələbə eyni zamanda ev sahibi ola bilər (məsələn, subarenda) — bu halda
 * hər iki dəst əlavə olunur, heç biri digərini əvəz etmir.
 */
export function abilitiesFor(actor: ActorRoles | null | undefined): Set<Ability> {
  if (!actor) return new Set(GUEST_ABILITIES);
  if (actor.isAdmin) return new Set(ADMIN_ABILITIES);

  const set = new Set<Ability>(AUTHENTICATED_ABILITIES);
  if (actor.isStudent) STUDENT_ABILITIES.forEach((a) => set.add(a));
  if (actor.isOwner) OWNER_ABILITIES.forEach((a) => set.add(a));
  return set;
}

export function can(actor: ActorRoles | null | undefined, ability: Ability): boolean {
  return abilitiesFor(actor).has(ability);
}

export function canAny(
  actor: ActorRoles | null | undefined,
  abilities: readonly Ability[],
): boolean {
  const set = abilitiesFor(actor);
  return abilities.some((a) => set.has(a));
}

export function canAll(
  actor: ActorRoles | null | undefined,
  abilities: readonly Ability[],
): boolean {
  const set = abilitiesFor(actor);
  return abilities.every((a) => set.has(a));
}

/** İnsanın oxuya biləcəyi rol siyahısı: "Tələbə · Ev sahibi" */
export function describeRoles(actor: ActorRoles): string {
  const parts: string[] = [];
  if (actor.isStudent) parts.push('Tələbə');
  if (actor.isOwner) parts.push('Ev sahibi');
  if (actor.isAdmin) parts.push('Admin');
  return parts.length ? parts.join(' · ') : 'İstifadəçi';
}
