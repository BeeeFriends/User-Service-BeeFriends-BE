import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateDepartmentDto } from './dto/create-department.dto';

@Injectable()
export class DepartmentService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.msDepartment.findMany({ where: { Stsrc: 'A' } });
  }

  async findOne(id: number) {
    const dept = await this.prisma.msDepartment.findUnique({
      where: { DepartmentID: id },
    });
    if (!dept) throw new NotFoundException('Department not found');
    return dept;
  }

  create(dto: CreateDepartmentDto) {
    return this.prisma.msDepartment.create({
      data: {
        DepartmentName: dto.departmentName,
        Stsrc: 'A',
        CreatedAt: new Date(),
      },
    });
  }
}
