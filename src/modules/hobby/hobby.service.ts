// Modules
import { Injectable, NotFoundException } from '@nestjs/common';
import { UserEventPublisher } from '@common';

// DTO
import { CreateHobbyDto } from '@beefriends/shared-kernel/dto';

// Prisma
import { HobbyRepository } from '@/modules/hobby/hobby.repository';

@Injectable()
export class HobbyService {
  constructor(
    private readonly hobbyRepository: HobbyRepository,
    private readonly userEventPublisher: UserEventPublisher,
  ) {}

  findAll() {
    return this.hobbyRepository.findAllActive();
  }

  async findOne(id: number) {
    const hobby = await this.hobbyRepository.findById(id);
    if (!hobby) throw new NotFoundException('Hobby not found');
    return hobby;
  }

  async create(userId: number, dto: CreateHobbyDto) {
    const hobby = await this.hobbyRepository.create(userId, dto);

    await this.userEventPublisher.publishHobbySynced(hobby);

    return hobby;
  }
}
