// Module
import { Injectable, NotFoundException } from '@nestjs/common';
import { ProfileReferenceService, UserEventPublisher } from '@common';

// DTO
import { UpdateUserDto } from '@beefriends/shared-kernel/dto';

// Service
import {
  normalizeStorageUrl,
  StorageService,
} from '@/modules/storage/storage.service';
import {
  UpdateUserProfileData,
  UserRepository,
} from '@/modules/user/user.repository';
import { toProfileResponse } from '@/modules/user/user-profile.mapper';
import {
  buildUserHobbyCreateRows,
  buildUserPhotoCreateRows,
} from '@/modules/user/user-profile-relations.mapper';

@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly userEventPublisher: UserEventPublisher,
    private readonly storageService: StorageService,
    private readonly profileReferenceService: ProfileReferenceService,
  ) {}

  async findById(id: number) {
    const user = await this.userRepository.findActiveProfileById(id);
    if (!user) throw new NotFoundException('User not found');
    return toProfileResponse(user);
  }

  async updateMe(userId: number, dto: UpdateUserDto) {
    if (dto.campusId !== undefined) {
      await this.profileReferenceService.ensureCampusExists(dto.campusId);
    }
    if (dto.majorId !== undefined) {
      await this.profileReferenceService.ensureMajorExists(dto.majorId);
    }
    if (dto.hobbyIds !== undefined) {
      await this.profileReferenceService.ensureHobbiesExist(dto.hobbyIds);
    }

    const data: UpdateUserProfileData = {
      UpdatedAt: new Date(),
      UpdatedBy: String(userId),
    };

    if (dto.displayName !== undefined) data.Username = dto.displayName;
    if (dto.description !== undefined) data.Description = dto.description;
    if (dto.phoneNumber !== undefined) data.PhoneNumber = dto.phoneNumber;
    if (dto.gender !== undefined) data.Gender = dto.gender;
    if (dto.age !== undefined) data.Age = dto.age;
    if (dto.campusId !== undefined) data.CampusID = dto.campusId;
    if (dto.majorId !== undefined) data.DepartmentID = dto.majorId;
    if (dto.binusianYear !== undefined) data.CodeYear = dto.binusianYear;
    if (dto.profilePhotoUrl !== undefined) {
      data.ProfilePhotoUrl = normalizeStorageUrl(dto.profilePhotoUrl);
    }

    const shouldRefreshRelations =
      dto.profilePhotoUrl !== undefined ||
      dto.photoUrls !== undefined ||
      dto.hobbyIds !== undefined;

    const user = shouldRefreshRelations
      ? await this.updateProfileRelations(userId, data, dto)
      : await this.userRepository.updateProfile(userId, data);

    await this.userEventPublisher.publishUserSynced(user);
    return toProfileResponse(user);
  }

  async uploadChatAttachment(userId: number, file: Express.Multer.File) {
    const user = await this.userRepository.findActiveEmailById(userId);

    if (!user) throw new NotFoundException('User not found');

    return this.storageService.uploadUserPhoto(user.Email, file, 'chat');
  }

  async uploadProfilePhoto(
    userId: number,
    file: Express.Multer.File,
    kind: 'profile' | 'gallery',
  ) {
    const user = await this.userRepository.findActiveEmailById(userId);

    if (!user) throw new NotFoundException('User not found');

    return this.storageService.uploadUserPhoto(user.Email, file, kind);
  }

  private async updateProfileRelations(
    userId: number,
    data: UpdateUserProfileData,
    dto: UpdateUserDto,
  ) {
    const currentUser = await this.userRepository.findProfileById(userId);
    if (!currentUser) throw new NotFoundException('User not found');

    const galleryUrls =
      dto.photoUrls?.map((url) => normalizeStorageUrl(url)) ??
      currentUser.photos.map((photo) => normalizeStorageUrl(photo.PhotoUrl));
    const photoRows = buildUserPhotoCreateRows(galleryUrls, userId);

    return this.userRepository.replaceProfileRelations(userId, {
      data,
      replacePhotos:
        dto.profilePhotoUrl !== undefined || dto.photoUrls !== undefined,
      photoRows,
      replaceHobbies: dto.hobbyIds !== undefined,
      hobbyRows:
        dto.hobbyIds !== undefined
          ? buildUserHobbyCreateRows(dto.hobbyIds, userId)
          : [],
    });
  }
}
