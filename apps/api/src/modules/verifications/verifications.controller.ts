import { Body, Controller, Get, Patch } from '@nestjs/common';
import { roommateProfileSchema } from '@yasayis/shared';
import { zodBody } from '../../common/pipes/zod-validation.pipe';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators';
import { VerificationsService } from './verifications.service';

/**
 * Öz təsdiq vəziyyətim və otaq yoldaşı profilimin görünürlüyü.
 *
 * TƏLƏBƏ VƏ EV SAHİBİ TƏSDİQİ ÇIXARILIB.
 *
 * Hər ikisi əl ilə yoxlama tələb edirdi və uzaqdan etibarlı şəkildə
 * yoxlanıla bilmirdi: göndərilən tələbə bileti şəkli və ya mülkiyyət sənədi
 * onu göndərənə aid olduğunu sübut etmir. Qazanıla bilməyən — və ya səhv
 * verilə bilən — nişan istifadəçidə yanlış etibar yaradır.
 *
 * TELEFON təsdiqi qalır: o, OTP ilə avtomatikdir və doğrudan yoxlanılır.
 * `GET verifications` da qalır, çünki telefon nişanı oradan oxunur.
 */
@Controller('me')
export class VerificationsController {
  constructor(private readonly verifications: VerificationsService) {}

  @Get('verifications')
  mine(@CurrentUser() actor: AuthUser) {
    return this.verifications.listForUser(actor.id);
  }

  @Get('roommate-profile')
  getRoommateProfile(@CurrentUser() actor: AuthUser) {
    return this.verifications.getRoommateProfile(actor.id);
  }

  /** `visible: true` yalnız telefon təsdiqlənibsə qəbul olunur. */
  @Patch('roommate-profile')
  updateRoommateProfile(
    @CurrentUser() actor: AuthUser,
    @Body(zodBody(roommateProfileSchema)) dto: unknown,
  ) {
    return this.verifications.updateRoommateProfile(actor.id, dto as never);
  }
}
