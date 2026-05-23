import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import type { CreateCampusDto } from '@beefriends/shared-kernel/dto';

@Injectable()
export class CampusRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAllActive() {
    return this.prisma.msCampus.findMany({
      where: { Stsrc: 'A' },
      orderBy: { CampusName: 'asc' },
    });
  }

  findById(id: number) {
    return this.prisma.msCampus.findUnique({
      where: { CampusID: id },
    });
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
