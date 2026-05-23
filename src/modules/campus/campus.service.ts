// Modules
import { Injectable, NotFoundException } from '@nestjs/common';
import { UserEventPublisher } from '@common';

// DTO
import { CreateCampusDto } from '@beefriends/shared-kernel/dto';

// Service
import { CampusRepository } from '@/modules/campus/campus.repository';

@Injectable()
export class CampusService {
  constructor(
    private readonly campusRepository: CampusRepository,
    private readonly userEventPublisher: UserEventPublisher,
  ) {}

  findAll() {
    return this.campusRepository.findAllActive();
  }

  async findOne(id: number) {
    const campus = await this.campusRepository.findById(id);
    if (!campus) throw new NotFoundException('Campus not found');
    return campus;
  }

  async create(dto: CreateCampusDto) {
    const campus = await this.campusRepository.create(dto);

    await this.userEventPublisher.publishCampusSynced(campus);

    return campus;
  }
}
