import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type {
  CityDto,
  CityInput,
  DistrictDto,
  DistrictInput,
  MajorDto,
  MajorInput,
  UniversityDto,
  UniversityInput,
  SeoRouteDto,
} from '@yasayis/shared';
import { isReservedSlug } from '@yasayis/shared';
import { TaxonomyRepository } from './taxonomy.repository';

/**
 * Taksonomiya qaydaları  (PROMPT A2)
 *
 * Siyahılar nadir dəyişir, amma onboarding (C1), axtarış filtrləri (D4) və
 * admin panel (G2) tərəfindən çox tez-tez oxunur — ona görə yaddaşda qısamüddətli
 * keş var. Hər yazma əməliyyatı keşi tam təmizləyir.
 */
@Injectable()
export class TaxonomyService {
  private static readonly TTL_MS = 5 * 60 * 1000;
  private readonly cache = new Map<string, { at: number; value: unknown }>();

  constructor(private readonly repo: TaxonomyRepository) {}

  // =========================================================================
  //  Oxuma — hamıya açıq
  // =========================================================================

  async getCities(includeInactive = false, q?: string): Promise<CityDto[]> {
    return this.cached(`cities:${includeInactive}:${q ?? ''}`, async () => {
      const rows = await this.repo.findCities(includeInactive, q);
      return rows.map(({ _count, ...c }) => ({ ...c, districtCount: _count.districts }));
    });
  }

  async getCityBySlug(slug: string): Promise<CityDto> {
    const city = await this.repo.findCityBySlug(slug);
    if (!city) throw new NotFoundException('Belə bir şəhər tapılmadı');
    return city;
  }

  getDistricts(cityId?: string, includeInactive = false, q?: string): Promise<DistrictDto[]> {
    return this.cached(`districts:${cityId ?? 'all'}:${includeInactive}:${q ?? ''}`, () =>
      this.repo.findDistricts(cityId, includeInactive, q),
    );
  }

  getUniversities(
    cityId?: string,
    includeInactive = false,
    q?: string,
  ): Promise<UniversityDto[]> {
    return this.cached(`universities:${cityId ?? 'all'}:${includeInactive}:${q ?? ''}`, () =>
      this.repo.findUniversities(cityId, includeInactive, q),
    );
  }

  /**
   * SEO marşrutları — admin yeni şəhər əlavə edəndə səhifə də avtomatik yaranır.
   * Kodda heç bir siyahı yoxdur.
   */
  getSeoRoutes(): Promise<SeoRouteDto[]> {
    return this.cached('seo-routes', async () => {
      const rows = await this.repo.findSeoRoutes();
      return rows.map((c) => ({
        citySlug: c.slug,
        cityName: c.name,
        districts: c.districts.map((d) => ({ slug: d.slug, name: d.name })),
      }));
    });
  }

  getMajors(includeInactive = false, q?: string): Promise<MajorDto[]> {
    return this.cached(`majors:${includeInactive}:${q ?? ''}`, () =>
      this.repo.findMajors(includeInactive, q),
    );
  }

  // =========================================================================
  //  Yazma — yalnız admin (icazə controller səviyyəsində yoxlanılır)
  // =========================================================================

  /**
   * Şəhər səhifəsi kök səviyyədədir (`/baki`), ona görə slug statik
   * marşrutlarla toqquşa bilməz — əks halda `/admin` şəhər kimi oxunardı.
   */
  private assertSlugAllowed(slug: string | undefined): void {
    if (slug && isReservedSlug(slug)) {
      throw new BadRequestException(
        `"${slug}" sistem marşrutudur və şəhər ünvanı kimi işlədilə bilməz`,
      );
    }
  }

  async createCity(input: CityInput): Promise<CityDto> {
    this.assertSlugAllowed(input.slug);
    const created = await this.guardUnique(() => this.repo.createCity(input), 'Bu slug artıq istifadə olunur');
    this.invalidate();
    return toCityDto(created);
  }

  async updateCity(id: string, input: Partial<CityInput>): Promise<CityDto> {
    this.assertSlugAllowed(input.slug);
    const updated = await this.guardUnique(
      () => this.repo.updateCity(id, input),
      'Bu slug artıq istifadə olunur',
    );
    this.invalidate();
    return toCityDto(updated);
  }

  /**
   * Şəhər silinməsi.
   * Şəhərə bağlı əmlak, tələbə və ya universitet varsa, silmək tarixçəni pozar —
   * bu halda deaktiv etmək təklif olunur.
   */
  async deleteCity(id: string): Promise<void> {
    const refs = await this.repo.countCityReferences(id);
    if (refs > 0) {
      throw new ConflictException(
        `Bu şəhərə bağlı ${refs} qeyd var. Silmək əvəzinə deaktiv edin.`,
      );
    }
    await this.repo.deleteCity(id);
    this.invalidate();
  }

  async createDistrict(input: DistrictInput): Promise<DistrictDto> {
    const created = await this.guardUnique(
      () => this.repo.createDistrict(input),
      'Bu şəhərdə eyni slug-lı rayon var',
    );
    this.invalidate();
    return created;
  }

  async updateDistrict(id: string, input: Partial<DistrictInput>): Promise<DistrictDto> {
    const updated = await this.guardUnique(
      () => this.repo.updateDistrict(id, input),
      'Bu şəhərdə eyni slug-lı rayon var',
    );
    this.invalidate();
    return updated;
  }

  async deleteDistrict(id: string): Promise<void> {
    const refs = await this.repo.countDistrictReferences(id);
    if (refs > 0) {
      throw new ConflictException(
        `Bu rayona bağlı ${refs} əmlak var. Silmək əvəzinə deaktiv edin.`,
      );
    }
    await this.repo.deleteDistrict(id);
    this.invalidate();
  }

  async createUniversity(input: UniversityInput): Promise<UniversityDto> {
    const created = await this.guardUnique(
      () => this.repo.createUniversity({ ...input, cityId: input.cityId ?? null }),
      'Bu slug artıq istifadə olunur',
    );
    this.invalidate();
    return created;
  }

  async updateUniversity(
    id: string,
    input: Partial<UniversityInput>,
  ): Promise<UniversityDto> {
    await this.assertNotOtherUniversity(id, 'dəyişdirilə');
    const updated = await this.guardUnique(
      () =>
        this.repo.updateUniversity(id, {
          ...input,
          ...(input.cityId !== undefined ? { cityId: input.cityId ?? null } : {}),
        }),
      'Bu slug artıq istifadə olunur',
    );
    this.invalidate();
    return updated;
  }

  async deleteUniversity(id: string): Promise<void> {
    await this.assertNotOtherUniversity(id, 'silinə');
    const refs = await this.repo.countUniversityReferences(id);
    if (refs > 0) {
      throw new ConflictException(
        `Bu universitetdə ${refs} tələbə profili var. Silmək əvəzinə deaktiv edin.`,
      );
    }
    await this.repo.deleteUniversity(id);
    this.invalidate();
  }

  async createMajor(input: MajorInput): Promise<MajorDto> {
    const created = await this.guardUnique(
      () => this.repo.createMajor(input),
      'Bu slug artıq istifadə olunur',
    );
    this.invalidate();
    return created;
  }

  async updateMajor(id: string, input: Partial<MajorInput>): Promise<MajorDto> {
    await this.assertNotOtherMajor(id, 'dəyişdirilə');
    const updated = await this.guardUnique(
      () => this.repo.updateMajor(id, input),
      'Bu slug artıq istifadə olunur',
    );
    this.invalidate();
    return updated;
  }

  async deleteMajor(id: string): Promise<void> {
    await this.assertNotOtherMajor(id, 'silinə');
    const refs = await this.repo.countMajorReferences(id);
    if (refs > 0) {
      throw new ConflictException(
        `Bu ixtisasda ${refs} tələbə profili var. Silmək əvəzinə deaktiv edin.`,
      );
    }
    await this.repo.deleteMajor(id);
    this.invalidate();
  }

  // =========================================================================
  //  Köməkçi
  // =========================================================================

  /**
   * "Digər / siyahıda yoxdur" qeydi sistem qeydidir: onboarding formasında
   * həmişə mövcud olmalıdır, ona görə nə silinir, nə də adı dəyişdirilir.
   */
  private async assertNotOtherUniversity(id: string, verb: string): Promise<void> {
    const row = await this.repo.findUniversityById(id);
    if (!row) throw new NotFoundException('Universitet tapılmadı');
    if (row.isOther) {
      throw new BadRequestException(`"Digər" seçimi sistem qeydidir və ${verb} bilməz`);
    }
  }

  private async assertNotOtherMajor(id: string, verb: string): Promise<void> {
    const row = await this.repo.findMajorById(id);
    if (!row) throw new NotFoundException('İxtisas tapılmadı');
    if (row.isOther) {
      throw new BadRequestException(`"Digər" seçimi sistem qeydidir və ${verb} bilməz`);
    }
  }

  /** Prisma-nın unikal indeks xətasını (P2002) insan dilinə çevirir. */
  private async guardUnique<T>(run: () => Promise<T>, message: string): Promise<T> {
    try {
      return await run();
    } catch (error) {
      if (isPrismaError(error, 'P2002')) throw new ConflictException(message);
      if (isPrismaError(error, 'P2025')) throw new NotFoundException('Qeyd tapılmadı');
      throw error;
    }
  }

  private invalidate(): void {
    this.cache.clear();
  }

  private async cached<T>(key: string, load: () => Promise<T>): Promise<T> {
    const hit = this.cache.get(key);
    if (hit && Date.now() - hit.at < TaxonomyService.TTL_MS) return hit.value as T;
    const value = await load();
    this.cache.set(key, { at: Date.now(), value });
    return value;
  }
}

function toCityDto(c: {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  sortOrder: number;
}): CityDto {
  return { id: c.id, name: c.name, slug: c.slug, isActive: c.isActive, sortOrder: c.sortOrder };
}

function isPrismaError(error: unknown, code: string): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: unknown }).code === code
  );
}
