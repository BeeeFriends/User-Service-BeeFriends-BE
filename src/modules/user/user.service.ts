import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UpdateUserDto } from '@beefriends/shared-kernel/dto';
import { UserEventPublisher } from '@common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userEventPublisher: UserEventPublisher,
  ) {}

  async findById(id: number) {
    const user = await this.prisma.msUser.findUnique({
      where: { UserID: id },
      include: this.userInclude,
    });
    if (!user) throw new NotFoundException('User not found');
    return this.toProfileResponse(user);
  }

  async updateMe(userId: number, dto: UpdateUserDto) {
    if (dto.campusId !== undefined) await this.ensureCampusExists(dto.campusId);
    if (dto.majorId !== undefined) await this.ensureMajorExists(dto.majorId);
    if (dto.hobbyIds !== undefined) await this.ensureHobbiesExist(dto.hobbyIds);

    const data: any = {
      UpdatedAt: new Date(),
      UpdatedBy: String(userId),
    };

    if (dto.displayName !== undefined) data.Username = dto.displayName;
    if (dto.description !== undefined) data.Description = dto.description;
    if (dto.phoneNumber !== undefined) data.PhoneNumber = dto.phoneNumber;
    if (dto.campusId !== undefined) data.CampusID = dto.campusId;
    if (dto.majorId !== undefined) data.DepartmentID = dto.majorId;
    if (dto.binusianYear !== undefined) data.CodeYear = dto.binusianYear;
    if (dto.profilePhotoUrl !== undefined) {
      data.ProfilePhotoUrl = dto.profilePhotoUrl;
    }

    const shouldRefreshRelations =
      dto.profilePhotoUrl !== undefined ||
      dto.photoUrls !== undefined ||
      dto.hobbyIds !== undefined;

    const user = shouldRefreshRelations
      ? await this.updateProfileRelations(userId, data, dto)
      : await this.prisma.msUser.update({
          where: { UserID: userId },
          data,
          include: this.userInclude,
        });

    await this.userEventPublisher.publishUserSynced(user);
    return this.toProfileResponse(user);
  }

  private readonly userInclude = {
    campus: true,
    department: true,
    hobbies: {
      where: { Stsrc: 'A' },
      include: { hobby: true },
      orderBy: { UserHobbyID: 'asc' as const },
    },
    photos: {
      where: { Stsrc: 'A' },
      orderBy: { SortOrder: 'asc' as const },
    },
  };

  private async updateProfileRelations(
    userId: number,
    data: Record<string, any>,
    dto: UpdateUserDto,
  ) {
    const currentUser = await this.prisma.msUser.findUnique({
      where: { UserID: userId },
      include: this.userInclude,
    });
    if (!currentUser) throw new NotFoundException('User not found');

    const profilePhotoUrl = dto.profilePhotoUrl ?? currentUser.ProfilePhotoUrl;
    const galleryUrls =
      dto.photoUrls ??
      currentUser.photos
        .filter((photo) => !photo.IsProfile)
        .map((photo) => photo.PhotoUrl);
    const photoRows = this.buildPhotoRows(profilePhotoUrl, galleryUrls, userId);

    return this.prisma.$transaction(async (tx) => {
      if (dto.profilePhotoUrl !== undefined || dto.photoUrls !== undefined) {
        await tx.trUserPhoto.updateMany({
          where: { UserID: userId, Stsrc: 'A' },
          data: {
            Stsrc: 'D',
            UpdatedAt: new Date(),
            UpdatedBy: String(userId),
          },
        });

        if (photoRows.length) {
          await tx.trUserPhoto.createMany({ data: photoRows });
        }
      }

      if (dto.hobbyIds !== undefined) {
        await tx.trUserHobby.deleteMany({
          where: { UserID: userId },
        });

        const hobbyRows = this.buildUserHobbyRows(dto.hobbyIds, userId);
        if (hobbyRows.length) {
          await tx.trUserHobby.createMany({ data: hobbyRows });
        }
      }

      return tx.msUser.update({
        where: { UserID: userId },
        data,
        include: this.userInclude,
      });
    });
  }

  private async ensureCampusExists(campusId: number) {
    const campus = await this.prisma.msCampus.findFirst({
      where: { CampusID: campusId, Stsrc: 'A' },
    });
    if (!campus) throw new BadRequestException('Campus not found');
  }

  private async ensureMajorExists(majorId: number) {
    const major = await this.prisma.msDepartment.findFirst({
      where: { DepartmentID: majorId, Stsrc: 'A' },
    });
    if (!major) throw new BadRequestException('Major not found');
  }

  private async ensureHobbiesExist(hobbyIds: number[]) {
    const uniqueHobbyIds = Array.from(new Set(hobbyIds));
    const hobbies = await this.prisma.msHobby.findMany({
      where: { HobbyID: { in: uniqueHobbyIds }, Stsrc: 'A' },
      select: { HobbyID: true },
    });

    if (hobbies.length !== uniqueHobbyIds.length) {
      throw new BadRequestException('One or more hobbies were not found');
    }
  }

  private buildPhotoRows(
    profilePhotoUrl: string,
    photoUrls: string[] = [],
    userId: number,
  ) {
    const uniqueUrls = Array.from(new Set([profilePhotoUrl, ...photoUrls]));

    return uniqueUrls.map((photoUrl, index) => ({
      UserID: userId,
      PhotoUrl: photoUrl,
      SortOrder: index,
      IsProfile: photoUrl === profilePhotoUrl,
      Stsrc: 'A',
      CreatedAt: new Date(),
      CreatedBy: String(userId),
    }));
  }

  private buildUserHobbyRows(hobbyIds: number[], userId: number) {
    return Array.from(new Set(hobbyIds)).map((hobbyId) => ({
      UserID: userId,
      HobbyID: hobbyId,
      Stsrc: 'A',
      CreatedAt: new Date(),
      CreatedBy: String(userId),
    }));
  }

  private toProfileResponse(user: any) {
    return {
      id: user.UserID,
      displayName: user.Username,
      binusianEmail: user.Email,
      phoneNumber: user.PhoneNumber,
      binusianYear: user.CodeYear,
      description: user.Description,
      profilePhotoUrl: user.ProfilePhotoUrl,
      campus: user.campus
        ? {
            id: user.campus.CampusID,
            name: user.campus.CampusName,
            address: user.campus.CampusAddress,
          }
        : null,
      major: user.department
        ? {
            id: user.department.DepartmentID,
            name: user.department.DepartmentName,
          }
        : null,
      hobbies:
        user.hobbies?.map((userHobby) => ({
          id: userHobby.hobby.HobbyID,
          name: userHobby.hobby.HobbyName,
        })) ?? [],
      photos:
        user.photos?.map((photo) => ({
          id: photo.UserPhotoID,
          url: photo.PhotoUrl,
          sortOrder: photo.SortOrder,
          isProfile: photo.IsProfile,
        })) ?? [],
    };
  }
}
