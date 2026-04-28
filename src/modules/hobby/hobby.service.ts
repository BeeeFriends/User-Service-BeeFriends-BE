import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateHobbyDto } from '@beefriends/shared-kernel/dto';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class HobbyService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.msHobby.findMany({
      where: { Stsrc: 'A' },
      orderBy: { HobbyName: 'asc' },
    });
  }

  async findOne(id: number) {
    const hobby = await this.prisma.msHobby.findUnique({
      where: { HobbyID: id },
    });
    if (!hobby) throw new NotFoundException('Hobby not found');
    return hobby;
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
