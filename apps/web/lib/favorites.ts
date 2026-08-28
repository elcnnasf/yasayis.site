'use client';

import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { FavoriteTarget, type FavoriteIdsDto } from '@yasayis/shared';
import { api, ApiRequestError } from './api-client';

/**
 * Favoritlərin client tərəfdəki vahid mənbəyi.
 *
 * Niyə modul səviyyəsində store, React context deyil:
 * ürək düyməsi səhifənin hər yerində — kart siyahısında, elan detalında,
 * otaq yoldaşı kartında — görünür. Context işlətsək, hər siyahını Provider-ə
 * bükmək lazım gələcək və "Saxlanılanlar"da bir elanı silmək digər səhifədəki
 * kartın vəziyyətini yeniləməyəcək.
 *
 * Modul store bir dəfə yüklənir, bütün abunəçilər eyni anda yenilənir və
 * `/favorites/ids` sorğusu səhifə başına BİR dəfə gedir — hər kart ayrıca
 * sorğu göndərsəydi, 20 kartlıq siyahı 20 sorğu deməkdi.
 */

type Snapshot = {
  listingIds: ReadonlySet<string>;
  roommateUserIds: ReadonlySet<string>;
  /** İlk yükləmə bitibmi — bitməyibsə ürək "boş" göstərilir, sayrışma olmasın. */
  loaded: boolean;
  /** Qonaqdır: sorğu 401 qaytarıb. Düymə girişə yönləndirir. */
  guest: boolean;
};

const EMPTY: Snapshot = {
  listingIds: new Set(),
  roommateUserIds: new Set(),
  loaded: false,
  guest: false,
};

let snapshot: Snapshot = EMPTY;
let loadPromise: Promise<void> | null = null;
const listeners = new Set<() => void>();

function emit(next: Snapshot): void {
  snapshot = next;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Server-də render zamanı heç nə seçilmiş görünmür — hidrasiya uyğunsuzluğu olmasın. */
function getServerSnapshot(): Snapshot {
  return EMPTY;
}

/** İlk çağırışda bir dəfə yükləyir; sonrakı çağırışlar eyni vədi paylaşır. */
function ensureLoaded(): void {
  if (loadPromise) return;

  loadPromise = api
    .get<FavoriteIdsDto>('/favorites/ids')
    .then((ids) => {
      emit({
        listingIds: new Set(ids.listingIds),
        roommateUserIds: new Set(ids.roommateUserIds),
        loaded: true,
        guest: false,
      });
    })
    .catch((e: unknown) => {
      const unauthorized =
        e instanceof ApiRequestError && (e.status === 401 || e.status === 403);
      emit({ ...EMPTY, loaded: true, guest: unauthorized });
    });
}

/** Sessiya dəyişəndə (giriş/çıxış) yenidən oxunsun. */
export function resetFavorites(): void {
  loadPromise = null;
  emit(EMPTY);
  ensureLoaded();
}

async function toggle(target: FavoriteTarget, id: string): Promise<boolean> {
  const key = target === FavoriteTarget.LISTING ? 'listingIds' : 'roommateUserIds';
  const current = snapshot[key];
  const isOn = current.has(id);

  // Optimist yeniləmə — ürək dərhal dolur. Şəbəkə xətası olsa geri qaytarılır.
  const next = new Set(current);
  if (isOn) next.delete(id);
  else next.add(id);
  emit({ ...snapshot, [key]: next });

  try {
    if (isOn) {
      await api.delete(`/favorites/${target}/${id}`);
    } else {
      await api.post('/favorites', { targetType: target, targetId: id });
    }
    return true;
  } catch (e) {
    emit({ ...snapshot, [key]: current });
    if (e instanceof ApiRequestError && (e.status === 401 || e.status === 403)) {
      emit({ ...snapshot, [key]: current, guest: true });
    }
    return false;
  }
}

/**
 * Bir obyektin favorit vəziyyəti.
 *
 * `guest` true olanda düymə saxlamağa çalışmır — istifadəçini girişə göndərir.
 * Səssiz uğursuzluq ən pis haldır: istifadəçi ürəyin dolduğunu görüb səhifəni
 * yeniləyəndə heç nə tapmır.
 */
export function useFavorite(target: FavoriteTarget, id: string) {
  const state = useSyncExternalStore(subscribe, () => snapshot, getServerSnapshot);

  useEffect(ensureLoaded, []);

  const key = target === FavoriteTarget.LISTING ? 'listingIds' : 'roommateUserIds';

  return {
    isFavorite: state[key].has(id),
    loaded: state.loaded,
    guest: state.guest,
    toggle: useCallback(() => toggle(target, id), [target, id]),
  };
}
