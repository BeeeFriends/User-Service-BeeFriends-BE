import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: number) {
    const user = await this.prisma.msUser.findUnique({
      where: { UserID: id },
      include: { campus: true, department: true, hobbies: true },
    });
    if (!user) throw new NotFoundException('User not found');
    const { Password, ...result } = user;
    return result;
  }

  async updateMe(userId: number, dto: UpdateUserDto) {
    const user = await this.prisma.msUser.update({
      where: { UserID: userId },
      data: {
        ...dto,
        UpdatedAt: new Date(),
        UpdatedBy: String(userId),
      },
      include: { campus: true, department: true, hobbies: true },
    });
    const { Password, ...result } = user;
    return result;
  }
}
