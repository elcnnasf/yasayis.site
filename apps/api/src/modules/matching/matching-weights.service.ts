import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import {
  assertWeightsValid,
  DEFAULT_WEIGHTS,
  MatchScorer,
  normalizeWeights,
  WeightedMatchScorer,
  type MatchingWeights,
} from '@yasayis/shared';
import { PrismaService } from '../../common/prisma/prisma.service';

/**
 * Uyğunluq çəkilərinin konfiqurasiyası.
 *
 * Çəkilər kodda sabit rəqəm kimi yazılmır — bazadakı tək sətirdən oxunur və
 * admin tərəfindən dəyişdirilə bilər. Sətir yoxdursa (və ya baza əlçatan
 * deyilsə) `DEFAULT_WEIGHTS` işlədilir: skorlama heç vaxt dayanmır.
 *
 * `getScorer()` hazırda çəkili formulanı qaytarır. Gələcəkdə AI-əsaslı model
 * gələndə yalnız bu metod dəyişəcək — çağıran service və controller yox.
 */
@Injectable()
export class MatchingWeightsService {
  private static readonly TTL_MS = 5 * 60 * 1000;
  private readonly logger = new Logger(MatchingWeightsService.name);
  private cache: { at: number; value: MatchingWeights } | null = null;

  constructor(private readonly prisma: PrismaService) {}

  async getWeights(): Promise<MatchingWeights> {
    if (this.cache && Date.now() - this.cache.at < MatchingWeightsService.TTL_MS) {
      return this.cache.value;
    }

    let weights = DEFAULT_WEIGHTS;
    try {
      const row = await this.prisma.matchingWeights.findUnique({ where: { id: 'default' } });
      if (row) {
        weights = normalizeWeights({
          budget: row.budget,
          location: row.location,
          university: row.university,
          lifestyle: row.lifestyle,
          smoking: row.smoking,
          pets: row.pets,
          genderAndRoom: row.genderAndRoom,
        });
      }
    } catch {
      // Konfiqurasiya oxunmasa da uyğunluq işləməlidir.
      this.logger.warn('Çəkilər bazadan oxunmadı — ilkin dəyərlər işlədilir');
    }

    this.cache = { at: Date.now(), value: weights };
    return weights;
  }

  /** Admin çəkiləri dəyişəndə. Cəm 100 olmasa dəyişiklik qəbul edilmir. */
  async updateWeights(weights: MatchingWeights, updatedById: string): Promise<MatchingWeights> {
    try {
      assertWeightsValid(weights);
    } catch (error) {
      throw new BadRequestException((error as Error).message);
    }

    await this.prisma.matchingWeights.upsert({
      where: { id: 'default' },
      update: { ...weights, updatedById },
      create: { id: 'default', ...weights, updatedById },
    });

    this.cache = null;
    return weights;
  }

  /**
   * Hazırkı skorlama strategiyası.
   * Yeni strategiya əlavə etmək üçün `MatchScorer` interfeysini tətbiq edib
   * burada qaytarmaq kifayətdir.
   */
  async getScorer(): Promise<MatchScorer> {
    return new WeightedMatchScorer(await this.getWeights());
  }
}
