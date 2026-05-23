// Module
import { Module } from '@nestjs/common';

// Contoller
import { DepartmentController } from '@/modules/department/department.controller';

// Service
import { DepartmentRepository } from '@/modules/department/department.repository';
import { DepartmentService } from '@/modules/department/department.service';

@Module({
  controllers: [DepartmentController],
  providers: [DepartmentService, DepartmentRepository],
})
export class DepartmentModule {}
