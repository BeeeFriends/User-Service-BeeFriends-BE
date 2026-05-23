// Module
import { Module } from '@nestjs/common';

// Controller
import { HobbyController } from '@/modules/hobby/hobby.controller';

// Service
import { HobbyRepository } from '@/modules/hobby/hobby.repository';
import { HobbyService } from '@/modules/hobby/hobby.service';

@Module({
  controllers: [HobbyController],
  providers: [HobbyService, HobbyRepository],
})
export class HobbyModule {}
