import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateHobbyDto } from './dto/create-hobby.dto';

@Injectable()
export class HobbyService {
  constructor(private readonly prisma: PrismaService) {}

  findMyHobbies(userId: number) {
    return this.prisma.trHobby.findMany({
      where: { UserID: userId, Stsrc: 'A' },
    });
  }

  create(userId: number, dto: CreateHobbyDto) {
    return this.prisma.trHobby.create({
      data: {
        UserID: userId,
        RoleName: dto.roleName,
        Stsrc: 'A',
        CreatedAt: new Date(),
        CreatedBy: String(userId),
      },
    });
  }

  async remove(userId: number, hobbyId: number) {
    const hobby = await this.prisma.trHobby.findUnique({
      where: { HobbyID: hobbyId },
    });
    if (!hobby) throw new NotFoundException('Hobby not found');
    if (hobby.UserID !== userId) throw new ForbiddenException();

    return this.prisma.trHobby.update({
      where: { HobbyID: hobbyId },
      data: { Stsrc: 'D', UpdatedAt: new Date(), UpdatedBy: String(userId) },
    });
  }
}
