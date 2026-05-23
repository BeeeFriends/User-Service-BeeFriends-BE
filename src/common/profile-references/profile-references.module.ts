import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { ProfileReferenceRepository } from '@/common/profile-references/profile-reference.repository';
import { ProfileReferenceService } from '@/common/profile-references/profile-reference.service';

@Module({
  imports: [PrismaModule],
  providers: [ProfileReferenceRepository, ProfileReferenceService],
  exports: [ProfileReferenceService],
})
export class ProfileReferencesModule {}
