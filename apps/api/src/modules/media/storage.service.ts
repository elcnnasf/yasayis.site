import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import type { Env } from '../../config/env';

export interface StoredFile {
  /** Saxlama daxilindəki yol — silmək üçün lazımdır. */
  path: string;
  /** Brauzerin açacağı tam ünvan. */
  url: string;
}

/**
 * Fayl saxlama.
 *
 * İki sürücü var və interfeys eynidir:
 *   · `local`    — dev üçün: fayllar `apps/api/uploads/` altına yazılır və
 *                  `/uploads` marşrutundan verilir. Supabase açarı lazım deyil.
 *   · `supabase` — prod üçün: Supabase Storage bucket-inə yüklənir.
 *
 * Çağıran kod sürücünü bilmir, ona görə prod-a keçid tək mühit dəyişəni ilə olur.
 */
@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private supabase: SupabaseClient | null = null;

  constructor(private readonly config: ConfigService<Env, true>) {}

  onModuleInit(): void {
    if (this.driver !== 'supabase') return;

    const url = this.config.get('SUPABASE_URL', { infer: true });
    const key = this.config.get('SUPABASE_SERVICE_ROLE_KEY', { infer: true });
    if (!url || !key) {
      throw new Error('STORAGE_DRIVER="supabase" üçün SUPABASE_URL və SUPABASE_SERVICE_ROLE_KEY məcburidir');
    }
    // Service role açarı yalnız serverdə qalır, brauzerə heç vaxt göndərilmir.
    this.supabase = createClient(url, key, { auth: { persistSession: false } });
  }

  private get driver(): 'local' | 'supabase' {
    return this.config.get('STORAGE_DRIVER', { infer: true });
  }

  private get bucket(): string {
    return this.config.get('SUPABASE_STORAGE_BUCKET', { infer: true });
  }

  private get publicUrl(): string {
    return this.config.get('PUBLIC_URL', { infer: true });
  }

  /**
   * Açarı `uploads/` qovluğunun İÇİNDƏKİ mütləq yola çevirir.
   *
   * Hazırda açarlar yalnız serverdə yaradılır (`properties/<id>/<uuid>.webp`),
   * yəni `../` heç vaxt gəlmir. Bu yoxlama gələcək üçündür: bir gün açar
   * istifadəçi girişindən formalaşsa, `join()` `../../` ardıcıllığını sakitcə
   * qəbul edər və yazma/silmə əməliyyatı qovluqdan çıxardı.
   */
  private resolveLocal(key: string): string {
    const root = resolve(process.cwd(), 'uploads');
    const target = resolve(root, key);
    const rel = relative(root, target);

    if (rel.startsWith('..') || resolve(root, rel) !== target) {
      throw new Error(`Fayl yolu icazəli qovluqdan kənardadır: ${key}`);
    }
    return target;
  }

  async put(key: string, body: Buffer, contentType: string): Promise<StoredFile> {
    if (this.driver === 'supabase') return this.putSupabase(key, body, contentType);
    return this.putLocal(key, body);
  }

  async remove(path: string): Promise<void> {
    try {
      if (this.driver === 'supabase') {
        await this.supabase?.storage.from(this.bucket).remove([path]);
      } else {
        await unlink(this.resolveLocal(path));
      }
    } catch (error) {
      // Fayl artıq yoxdursa, bu xəta deyil — qeyd yenə də silinməlidir.
      this.logger.warn(`Fayl silinmədi (${path}): ${String(error)}`);
    }
  }

  private async putLocal(key: string, body: Buffer): Promise<StoredFile> {
    const absolute = this.resolveLocal(key);
    await mkdir(dirname(absolute), { recursive: true });
    await writeFile(absolute, body);
    return { path: key, url: `${this.publicUrl}/uploads/${key}` };
  }

  private async putSupabase(
    key: string,
    body: Buffer,
    contentType: string,
  ): Promise<StoredFile> {
    if (!this.supabase) throw new Error('Supabase Storage hazır deyil');

    const { error } = await this.supabase.storage
      .from(this.bucket)
      .upload(key, body, { contentType, upsert: true });

    if (error) {
      this.logger.error(`Supabase Storage yükləmə xətası: ${error.message}`);
      throw new Error('Şəkil yüklənə bilmədi');
    }

    const { data } = this.supabase.storage.from(this.bucket).getPublicUrl(key);
    return { path: key, url: data.publicUrl };
  }
}
