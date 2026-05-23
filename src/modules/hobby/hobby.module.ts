// Module
import { Module } from '@nestjs/common';

// Controller
import { HobbyController } from '@/modules/hobby/hobby.controller';

// Service
import { HobbyService } from '@/modules/hobby/hobby.service';

@Module({
  controllers: [HobbyController],
  providers: [HobbyService],
})
export class HobbyModule {}
