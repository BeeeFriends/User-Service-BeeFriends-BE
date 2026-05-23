import { BadRequestException, Injectable } from '@nestjs/common';
import { ProfileReferenceRepository } from '@/common/profile-references/profile-reference.repository';

@Injectable()
export class ProfileReferenceService {
  constructor(
    private readonly profileReferenceRepository: ProfileReferenceRepository,
  ) {}

  async ensureCampusExists(campusId: number) {
    const campus =
      await this.profileReferenceRepository.findActiveCampusById(campusId);
    if (!campus) throw new BadRequestException('Campus not found');
  }

  async ensureMajorExists(majorId: number) {
    const major =
      await this.profileReferenceRepository.findActiveDepartmentById(majorId);
    if (!major) throw new BadRequestException('Major not found');
  }

  async ensureHobbiesExist(hobbyIds: number[]) {
    const uniqueHobbyIds = Array.from(new Set(hobbyIds));
    const hobbies =
      await this.profileReferenceRepository.findActiveHobbiesByIds(
        uniqueHobbyIds,
      );

    if (hobbies.length !== uniqueHobbyIds.length) {
      throw new BadRequestException('One or more hobbies were not found');
    }
  }
}
