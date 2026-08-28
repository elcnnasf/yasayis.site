import { Module } from '@nestjs/common';
import { OwnerProfileRepository } from './owner-profile.repository';
import { OwnerProfileService } from './owner-profile.service';
import { ProfilesController, PublicProfilesController } from './profiles.controller';
import { ProfilesRepository } from './profiles.repository';
import { ProfilesService } from './profiles.service';

@Module({
  controllers: [ProfilesController, PublicProfilesController],
  providers: [ProfilesService, ProfilesRepository, OwnerProfileService, OwnerProfileRepository],
  exports: [ProfilesService, OwnerProfileService],
})
export class ProfilesModule {}
