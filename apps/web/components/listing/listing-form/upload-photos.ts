import { LISTING, type UploadedImageDto } from '@yasayis/shared';
import { refreshSession } from '@/lib/api-client';
import type { LocalPhoto } from '../photo-uploader';

/**
 * Şəkillərin yüklənməsi.
 *
 * `api` client-indən İSTİFADƏ ETMİR, çünki o hər gövdəni JSON-a çevirir;
 * burada isə `multipart/form-data` lazımdır. `Content-Type` QƏSDƏN
 * qoyulmur — brauzer onu `boundary` ilə birlikdə özü yazmalıdır.
 *
 * Fayllar BİR-BİR gedir, hamısı birdən yox:
 *   · istifadəçi irəliləyişi görür ("3 / 7"),
 *   · bir fayl xarab olanda qalanları yenidən yüklənmir,
 *   · serverdəki `sortOrder` yükləmə sırasıdır, ona görə ardıcıllıq vacibdir
 *     və paralel sorğular onu qarışdırar.
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

export interface UploadOutcome {
  uploaded: number;
  /** Yüklənməyən faylların adları — istifadəçiyə konkret deyilir. */
  failed: string[];
}

export async function uploadPhotos(
  listingId: string,
  photos: LocalPhoto[],
  onProgress: (done: number) => void,
): Promise<UploadOutcome> {
  const failed: string[] = [];
  let uploaded = 0;

  for (const photo of photos) {
    const body = new FormData();
    body.append('file', photo.file);

    try {
      let response = await fetch(`${BASE_URL}/listings/${listingId}/images`, {
        method: 'POST',
        body,
        credentials: 'include',
      });

      // Şəkil yükləmə uzun çəkə bilir və access token 15 dəqiqəlikdir. Token
      // yolun ortasında bitəndə qalan fayllar 401 alırdı; sessiya uzadılıb
      // fayl bir dəfə yenidən göndərilir. `FormData` təkrar oxuna bilər.
      if (response.status === 401 && (await refreshSession())) {
        response = await fetch(`${BASE_URL}/listings/${listingId}/images`, {
          method: 'POST',
          body,
          credentials: 'include',
        });
      }

      // Köhnə formada bu yoxlama YOX idi: `fetch` 500 cavabında da uğurla
      // qayıdır, ona görə şəkil yüklənməsə də elan "hazırdır" görünürdü və
      // istifadəçi şəkilsiz elanı ancaq sonra görürdü.
      if (!response.ok) {
        failed.push(photo.file.name);
        continue;
      }

      // Cavab oxunmasa da olar, amma oxumaq bağlantını təmiz bağlayır.
      (await response.json().catch(() => null)) as UploadedImageDto | null;
      uploaded += 1;
      onProgress(uploaded);
    } catch {
      failed.push(photo.file.name);
    }
  }

  return { uploaded, failed };
}

/**
 * Faylın yüklənməyə yararlı olub-olmadığı.
 *
 * Serverdə də yoxlanılır, amma orada yoxlanmaq üçün əvvəlcə 5 MB-lıq fayl
 * şəbəkədən keçməlidir. Burada dərhal deyilir və mobil internet boşuna
 * xərclənmir.
 */
export function rejectionReason(file: File): string | null {
  const allowed = LISTING.IMAGE_MIME_TYPES as readonly string[];

  if (!allowed.includes(file.type)) {
    return `${file.name} — yalnız JPG, PNG, WebP və HEIC qəbul olunur`;
  }
  if (file.size > LISTING.IMAGE_MAX_BYTES) {
    const mb = Math.round(LISTING.IMAGE_MAX_BYTES / (1024 * 1024));
    return `${file.name} — fayl ${mb} MB-dan böyükdür`;
  }
  return null;
}
