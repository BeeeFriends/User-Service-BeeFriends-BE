// Module
import { Module } from '@nestjs/common';

// Controller
import { CampusController } from '@/modules/campus/campus.controller';

// Service
import { CampusRepository } from '@/modules/campus/campus.repository';
import { CampusService } from '@/modules/campus/campus.service';

@Module({
  controllers: [CampusController],
  providers: [CampusService, CampusRepository],
})
export class CampusModule {}
