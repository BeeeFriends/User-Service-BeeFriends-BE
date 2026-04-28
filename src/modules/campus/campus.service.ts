import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateCampusDto } from '@beefriends/shared-kernel/dto';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CampusService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.msCampus.findMany({
      where: { Stsrc: 'A' },
      orderBy: { CampusName: 'asc' },
    });
  }

  async findOne(id: number) {
    const campus = await this.prisma.msCampus.findUnique({
      where: { CampusID: id },
    });
    if (!campus) throw new NotFoundException('Campus not found');
    return campus;
  }

  create(dto: CreateCampusDto) {
    return this.prisma.msCampus.create({
      data: {
        CampusName: dto.campusName,
        CampusAddress: dto.campusAddress,
        Stsrc: 'A',
        CreatedAt: new Date(),
      },
    });
  }
}
