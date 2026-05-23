// Module
import { Module } from '@nestjs/common';

// Contoller
import { DepartmentController } from '@/modules/department/department.controller';

// Service
import { DepartmentService } from '@/modules/department/department.service';

@Module({
  controllers: [DepartmentController],
  providers: [DepartmentService],
})
export class DepartmentModule {}
