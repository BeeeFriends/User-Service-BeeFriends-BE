import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateDepartmentDto } from '@beefriends/shared-kernel/dto';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DepartmentService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.msDepartment.findMany({
      where: { Stsrc: 'A' },
      orderBy: { DepartmentName: 'asc' },
    });
  }

  async findOne(id: number) {
    const dept = await this.prisma.msDepartment.findUnique({
      where: { DepartmentID: id },
    });
    if (!dept) throw new NotFoundException('Major not found');
    return dept;
  }

  create(dto: CreateDepartmentDto) {
    return this.prisma.msDepartment.create({
      data: {
        DepartmentName: dto.majorName,
        Stsrc: 'A',
        CreatedAt: new Date(),
      },
    });
  }
}
