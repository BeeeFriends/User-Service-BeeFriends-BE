// Module
import { Injectable, NotFoundException } from '@nestjs/common';
import { UserEventPublisher } from '@common';

// DTO
import { CreateDepartmentDto } from '@beefriends/shared-kernel/dto';

// Service
import { DepartmentRepository } from '@/modules/department/department.repository';

@Injectable()
export class DepartmentService {
  constructor(
    private readonly departmentRepository: DepartmentRepository,
    private readonly userEventPublisher: UserEventPublisher,
  ) {}

  findAll() {
    return this.departmentRepository.findAllActive();
  }

  async findOne(id: number) {
    const dept = await this.departmentRepository.findById(id);
    if (!dept) throw new NotFoundException('Major not found');
    return dept;
  }

  async create(dto: CreateDepartmentDto) {
    const department = await this.departmentRepository.create(dto);

    await this.userEventPublisher.publishDepartmentSynced(department);

    return department;
  }
}
