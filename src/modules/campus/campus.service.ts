// Modules
import { Injectable, NotFoundException } from '@nestjs/common';
import { UserEventPublisher } from '@common';

// DTO
import { CreateCampusDto } from '@beefriends/shared-kernel/dto';

// Service
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class CampusService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userEventPublisher: UserEventPublisher,
  ) {}

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

  async create(dto: CreateCampusDto) {
    const campus = await this.prisma.msCampus.create({
      data: {
        CampusName: dto.campusName,
        CampusAddress: dto.campusAddress,
        Stsrc: 'A',
        CreatedAt: new Date(),
      },
    });

    await this.userEventPublisher.publishCampusSynced(campus);

    return campus;
  }
}
