import { Injectable } from '@nestjs/common';
import type { Prisma } from '@yasayis/db';
import { PrismaService } from '../../common/prisma/prisma.service';

/**
 * Taksonomiya sorğuları — yalnız baza, heç bir qayda.
 * Qaydalar (kim yaza bilər, "Digər" silinə bilərmi) service təbəqəsindədir.
 */
@Injectable()
export class TaxonomyRepository {
  constructor(private readonly prisma: PrismaService) {}

  private activeFilter(includeInactive: boolean) {
    return includeInactive ? {} : { isActive: true };
  }

  private nameSearch(q?: string): Prisma.StringFilter | undefined {
    return q ? { contains: q, mode: 'insensitive' } : undefined;
  }

  // --- Şəhər ---------------------------------------------------------------

  findCities(includeInactive = false, q?: string) {
    return this.prisma.city.findMany({
      where: { ...this.activeFilter(includeInactive), name: this.nameSearch(q) },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        slug: true,
        isActive: true,
        sortOrder: true,
        _count: { select: { districts: true } },
      },
    });
  }

  findCityBySlug(slug: string) {
    return this.prisma.city.findUnique({
      where: { slug },
      select: { id: true, name: true, slug: true, isActive: true, sortOrder: true },
    });
  }

  createCity(data: Prisma.CityCreateInput) {
    return this.prisma.city.create({ data });
  }

  updateCity(id: string, data: Prisma.CityUpdateInput) {
    return this.prisma.city.update({ where: { id }, data });
  }

  deleteCity(id: string) {
    return this.prisma.city.delete({ where: { id } });
  }

  /** Silinmədən əvvəl: şəhərə bağlı olan hər şey. */
  async countCityReferences(id: string): Promise<number> {
    const [properties, students, universities] = await Promise.all([
      this.prisma.property.count({ where: { cityId: id } }),
      this.prisma.studentProfile.count({ where: { cityId: id } }),
      this.prisma.university.count({ where: { cityId: id } }),
    ]);
    return properties + students + universities;
  }

  /** SEO landing səhifələri üçün: bütün aktiv şəhər + rayon kombinasiyaları. */
  findSeoRoutes() {
    return this.prisma.city.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: {
        slug: true,
        name: true,
        districts: {
          where: { isActive: true },
          orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
          select: { slug: true, name: true },
        },
      },
    });
  }

  // --- Rayon ---------------------------------------------------------------

  findDistricts(cityId?: string, includeInactive = false, q?: string) {
    return this.prisma.district.findMany({
      where: {
        ...this.activeFilter(includeInactive),
        ...(cityId ? { cityId } : {}),
        name: this.nameSearch(q),
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        cityId: true,
        name: true,
        slug: true,
        isActive: true,
        sortOrder: true,
      },
    });
  }

  createDistrict(data: Prisma.DistrictUncheckedCreateInput) {
    return this.prisma.district.create({ data });
  }

  updateDistrict(id: string, data: Prisma.DistrictUncheckedUpdateInput) {
    return this.prisma.district.update({ where: { id }, data });
  }

  deleteDistrict(id: string) {
    return this.prisma.district.delete({ where: { id } });
  }

  countDistrictReferences(id: string): Promise<number> {
    return this.prisma.property.count({ where: { districtId: id } });
  }

  // --- Universitet ---------------------------------------------------------

  findUniversities(cityId?: string, includeInactive = false, q?: string) {
    return this.prisma.university.findMany({
      where: {
        ...this.activeFilter(includeInactive),
        ...(cityId ? { cityId } : {}),
        name: this.nameSearch(q),
      },
      // "Digər" seçimi sortOrder 9999 ilə həmişə sonda qalır.
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        cityId: true,
        name: true,
        shortName: true,
        slug: true,
        isOther: true,
        isActive: true,
        sortOrder: true,
      },
    });
  }

  findUniversityById(id: string) {
    return this.prisma.university.findUnique({ where: { id } });
  }

  createUniversity(data: Prisma.UniversityUncheckedCreateInput) {
    return this.prisma.university.create({ data });
  }

  updateUniversity(id: string, data: Prisma.UniversityUncheckedUpdateInput) {
    return this.prisma.university.update({ where: { id }, data });
  }

  deleteUniversity(id: string) {
    return this.prisma.university.delete({ where: { id } });
  }

  countUniversityReferences(id: string): Promise<number> {
    return this.prisma.studentProfile.count({ where: { universityId: id } });
  }

  // --- İxtisas -------------------------------------------------------------

  findMajors(includeInactive = false, q?: string) {
    return this.prisma.major.findMany({
      where: { ...this.activeFilter(includeInactive), name: this.nameSearch(q) },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        slug: true,
        isOther: true,
        isActive: true,
        sortOrder: true,
      },
    });
  }

  findMajorById(id: string) {
    return this.prisma.major.findUnique({ where: { id } });
  }

  createMajor(data: Prisma.MajorCreateInput) {
    return this.prisma.major.create({ data });
  }

  updateMajor(id: string, data: Prisma.MajorUpdateInput) {
    return this.prisma.major.update({ where: { id }, data });
  }

  deleteMajor(id: string) {
    return this.prisma.major.delete({ where: { id } });
  }

  countMajorReferences(id: string): Promise<number> {
    return this.prisma.studentProfile.count({ where: { majorId: id } });
  }
}
