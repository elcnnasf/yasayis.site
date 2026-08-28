import { Module } from '@nestjs/common';
import { MatchingWeightsService } from './matching-weights.service';

/**
 * Uyğunluq konfiqurasiyası.
 * Qlobal deyil — yalnız ona ehtiyacı olan modul import edir.
 */
@Module({
  providers: [MatchingWeightsService],
  exports: [MatchingWeightsService],
})
export class MatchingModule {}
