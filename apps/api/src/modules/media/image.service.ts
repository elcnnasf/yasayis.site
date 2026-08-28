import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import sharp, { type OutputInfo, type Sharp } from 'sharp';
import { LISTING } from '@yasayis/shared';
import { StorageService } from './storage.service';

/**
 * Açılmış şəklin maksimum piksel sayı (≈ 50 MP).
 * Real telefon fotosu 12–48 MP-dir; bundan yuxarısı ya səhv, ya hücumdur.
 */
const MAX_INPUT_PIXELS = 50_000_000;

/**
 * Dekoderin tanıdığı və qəbul etdiyimiz formatlar.
 *
 * `svg` QƏSDƏN YOXDUR: SVG icra oluna bilən məzmundur (skript, xarici
 * resurs yükləməsi) və şəkil kimi saxlanılanda saxlanmış XSS mənbəyinə
 * çevrilir. `gif` də yoxdur — animasiya emalı ayrıca risk səthidir.
 */
const DECODABLE_FORMATS = new Set(['jpeg', 'jpg', 'png', 'webp', 'heif', 'heic', 'avif']);

export interface ProcessedImage {
  path: string;
  url: string;
  thumbPath: string;
  thumbUrl: string;
  width: number;
  height: number;
  sizeBytes: number;
}

/**
 * Şəkil emalı.
 *
 * Yüklənən fayl heç vaxz olduğu kimi saxlanılmır:
 *   · WebP-yə çevrilir (JPEG-dən ~30% kiçik),
 *   · maksimum 1920px enə qədər kiçildilir,
 *   · 480px thumbnail yaradılır (siyahı və kartlar üçün).
 *
 * EXIF məlumatı (o cümlədən çəkilmə yeri) silinir — istifadəçinin ev ünvanı
 * şəkil metadatası vasitəsilə sızmasın.
 */
@Injectable()
export class ImageService {
  constructor(private readonly storage: StorageService) {}

  async process(file: Express.Multer.File, folder: string): Promise<ProcessedImage> {
    this.assertValid(file);

    const base = `${folder}/${randomUUID()}`;

    /*
      `limitInputPixels` AÇIQ verilir — "arxiv bombası"na qarşı.

      5 MB-lıq PNG sıxılmış halda cəmi bir neçə kilobayt ola bilər, amma
      açılanda 50 000 × 50 000 piksel (≈ 10 GB yaddaş) tutur və serveri
      yaddaşsız qoyur. Ölçü limiti bunu tutmur, çünki FAYL kiçikdir.

      `failOn: 'error'` isə xarab və ya qəsdən pozulmuş fayllarda emalı
      dayandırır — sharp onları "təxmin edərək" oxumağa çalışmasın.
    */
    const source = sharp(file.buffer, {
      failOn: 'error',
      limitInputPixels: MAX_INPUT_PIXELS,
    }).rotate();

    // Faylın ƏSL formatı yoxlanılır. `file.mimetype` client-in göndərdiyi
    // başlıqdır və uydurula bilər: SVG və ya HTML faylı `image/jpeg` kimi
    // etiketlənə bilər. Burada isə qərarı dekoder verir.
    await this.assertDecodableImage(source);

    let full: { data: Buffer; info: OutputInfo };
    let thumb: Buffer;

    try {
      full = await source
        .clone()
        .resize({ width: LISTING.IMAGE_MAX_WIDTH, withoutEnlargement: true })
        .webp({ quality: 82 })
        .toBuffer({ resolveWithObject: true });

      thumb = await source
        .clone()
        .resize({ width: LISTING.THUMB_WIDTH, withoutEnlargement: true })
        .webp({ quality: 72 })
        .toBuffer();
    } catch {
      throw new BadRequestException('Şəkil oxuna bilmədi. Başqa fayl seçin.');
    }

    const [stored, storedThumb] = await Promise.all([
      this.storage.put(`${base}.webp`, full.data, 'image/webp'),
      this.storage.put(`${base}-thumb.webp`, thumb, 'image/webp'),
    ]);

    return {
      path: stored.path,
      url: stored.url,
      thumbPath: storedThumb.path,
      thumbUrl: storedThumb.url,
      width: full.info.width,
      height: full.info.height,
      sizeBytes: full.info.size,
    };
  }

  /** Şəkil silinəndə həm əsas fayl, həm thumbnail təmizlənir. */
  async remove(path: string): Promise<void> {
    await Promise.all([
      this.storage.remove(path),
      this.storage.remove(path.replace(/\.webp$/, '-thumb.webp')),
    ]);
  }

  /**
   * Faylın həqiqətən dəstəklənən rastr şəkil olduğunu təsdiqləyir.
   *
   * Çevirmənin özü onsuz da qorunma verir (nəticə həmişə yenidən kodlanmış
   * WebP-dir, ona görə içindəki skript və ya polyglot məzmun itir), amma
   * formatı əvvəlcədən yoxlamaq iki şey qazandırır: hücumçu emal dövrünü
   * boşuna işlətmir və istifadəçi aydın xəta mesajı alır.
   */
  private async assertDecodableImage(source: Sharp): Promise<void> {
    let format: string | undefined;

    try {
      ({ format } = await source.clone().metadata());
    } catch {
      throw new BadRequestException('Fayl şəkil kimi oxuna bilmədi.');
    }

    if (!format || !DECODABLE_FORMATS.has(format)) {
      throw new BadRequestException(
        'Yalnız JPG, PNG, WebP və HEIC formatları qəbul olunur',
      );
    }
  }

  private assertValid(file: Express.Multer.File): void {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Fayl boşdur');
    }
    if (file.size > LISTING.IMAGE_MAX_BYTES) {
      const mb = Math.round(LISTING.IMAGE_MAX_BYTES / 1024 / 1024);
      throw new BadRequestException(`Şəkil ${mb} MB-dan böyük ola bilməz`);
    }
    if (!LISTING.IMAGE_MIME_TYPES.includes(file.mimetype as never)) {
      throw new BadRequestException('Yalnız JPG, PNG, WebP və HEIC formatları qəbul olunur');
    }
  }
}
