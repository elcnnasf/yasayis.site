import { Injectable, NotFoundException } from '@nestjs/common';
import type { SearchAlertInput } from '@yasayis/shared';
import { PrismaService } from '../../common/prisma/prisma.service';

/**
 * Saxlanmış axtarışlar.
 *
 * İstifadəçi filtri yadda saxlayır; uyğun elan yerləşəndə bildiriş alır
 * (bildiriş göndərmə Prompt I2-də qurulacaq — burada saxlama və oxuma var).
 */
@Injectable()
export class SearchAlertsService {
  /** Bir istifadəçidə çox sayda bildiriş spam yaradar. */
  private static readonly MAX_PER_USER = 10;

  constructor(private readonly prisma: PrismaService) {}

  list(userId: string) {
    return this.prisma.searchAlert.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        city: { select: { name: true } },
        district: { select: { name: true } },
        university: { select: { shortName: true, name: true } },
      },
    });
  }

  async create(userId: string, input: SearchAlertInput) {
    const count = await this.prisma.searchAlert.count({ where: { userId } });
    if (count >= SearchAlertsService.MAX_PER_USER) {
      // Köhnəni silmək əvəzinə istifadəçiyə deyirik — səssiz itki pisdir.
      throw new NotFoundException(
        `Ən çox ${SearchAlertsService.MAX_PER_USER} axtarış saxlaya bilərsiniz. Birini silin.`,
      );
    }

    return this.prisma.searchAlert.create({
      data: {
        userId,
        name: input.name ?? null,
        cityId: input.cityId ?? null,
        districtId: input.districtId ?? null,
        universityId: input.universityId ?? null,
        priceMin: input.priceMin ?? null,
        priceMax: input.priceMax ?? null,
        roomCount: input.roomCount ?? null,
        studentOnly: input.studentOnly,
      },
    });
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.prisma.searchAlert.deleteMany({ where: { id, userId } });
  }

  async setActive(userId: string, id: string, isActive: boolean) {
    const result = await this.prisma.searchAlert.updateMany({
      where: { id, userId },
      data: { isActive },
    });
    if (result.count === 0) throw new NotFoundException('Axtarış tapılmadı');
    return { id, isActive };
  }
}
