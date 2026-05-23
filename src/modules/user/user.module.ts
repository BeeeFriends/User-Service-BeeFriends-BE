// Module
import { Module } from '@nestjs/common';

// Imports
import { StorageModule } from '@/modules/storage/storage.module';

// Contoller
import { UserController } from '@/modules/user/user.controller';

// Service
import { UserService } from '@/modules/user/user.service';

@Module({
  imports: [StorageModule],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
