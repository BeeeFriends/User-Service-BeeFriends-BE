import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateDepartmentDto } from '@beefriends/shared-kernel/dto';
import { UserEventPublisher } from '@common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DepartmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userEventPublisher: UserEventPublisher,
  ) {}

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

  async create(dto: CreateDepartmentDto) {
    const department = await this.prisma.msDepartment.create({
      data: {
        DepartmentName: dto.majorName,
        Stsrc: 'A',
        CreatedAt: new Date(),
      },
    });

    await this.userEventPublisher.publishDepartmentSynced(department);

    return department;
  }
}
