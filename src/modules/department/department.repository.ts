import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import type { CreateDepartmentDto } from '@beefriends/shared-kernel/dto';

@Injectable()
export class DepartmentRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAllActive() {
    return this.prisma.msDepartment.findMany({
      where: { Stsrc: 'A' },
      orderBy: { DepartmentName: 'asc' },
    });
  }

  findById(id: number) {
    return this.prisma.msDepartment.findUnique({
      where: { DepartmentID: id },
    });
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
