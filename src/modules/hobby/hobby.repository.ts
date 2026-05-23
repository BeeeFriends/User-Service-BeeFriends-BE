import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import type { CreateHobbyDto } from '@beefriends/shared-kernel/dto';

@Injectable()
export class HobbyRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAllActive() {
    return this.prisma.msHobby.findMany({
      where: { Stsrc: 'A' },
      orderBy: { HobbyName: 'asc' },
    });
  }

  findById(id: number) {
    return this.prisma.msHobby.findUnique({
      where: { HobbyID: id },
    });
  }

  create(userId: number, dto: CreateHobbyDto) {
    return this.prisma.msHobby.create({
      data: {
        HobbyName: dto.hobbyName,
        Stsrc: 'A',
        CreatedAt: new Date(),
        CreatedBy: String(userId),
      },
    });
  }
}
