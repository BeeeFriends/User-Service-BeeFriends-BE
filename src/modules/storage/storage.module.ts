// Module
import { Module } from '@nestjs/common';

// Controller
import { StorageController } from '@/modules/storage/storage.controller';

// Service
import { StorageService } from '@/modules/storage/storage.service';

@Module({
  controllers: [StorageController],
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule {}
