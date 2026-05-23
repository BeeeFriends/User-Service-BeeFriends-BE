// Module
import { Module } from '@nestjs/common';

// Imports
import { StorageModule } from '@/modules/storage/storage.module';
import { ProfileReferencesModule } from '@common';

// Contoller
import { UserController } from '@/modules/user/user.controller';

// Service
import { UserRepository } from '@/modules/user/user.repository';
import { UserService } from '@/modules/user/user.service';

@Module({
  imports: [StorageModule, ProfileReferencesModule],
  controllers: [UserController],
  providers: [UserService, UserRepository],
  exports: [UserService],
})
export class UserModule {}
