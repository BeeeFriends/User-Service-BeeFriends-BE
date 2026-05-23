// Module
import { Module } from '@nestjs/common';

// Controller
import { CampusController } from '@/modules/campus/campus.controller';

// Service
import { CampusService } from '@/modules/campus/campus.service';

@Module({
  controllers: [CampusController],
  providers: [CampusService],
})
export class CampusModule {}
