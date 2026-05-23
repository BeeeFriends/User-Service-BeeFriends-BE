import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/user-client';
import { PrismaService } from '@/prisma/prisma.service';
import {
  USER_PROFILE_INCLUDE,
  type UserProfile,
} from '@/modules/user/user-profile.prisma';

export type UpdateUserProfileData = Prisma.MsUserUncheckedUpdateInput;
export type CreateUserPhotoRow = Prisma.TrUserPhotoCreateManyInput;
export type CreateUserHobbyRow = Prisma.TrUserHobbyCreateManyInput;

type ReplaceProfileRelationsOptions = {
  data: UpdateUserProfileData;
  replacePhotos: boolean;
  photoRows: CreateUserPhotoRow[];
  replaceHobbies: boolean;
  hobbyRows: CreateUserHobbyRow[];
};

@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  findActiveProfileById(id: number) {
    return this.prisma.msUser.findFirst({
      where: { UserID: id, Stsrc: 'A' },
      include: USER_PROFILE_INCLUDE,
    });
  }

  findProfileById(id: number) {
    return this.prisma.msUser.findUnique({
      where: { UserID: id },
      include: USER_PROFILE_INCLUDE,
    });
  }

  findActiveEmailById(id: number) {
    return this.prisma.msUser.findFirst({
      where: { UserID: id, Stsrc: 'A' },
      select: { Email: true },
    });
  }

  updateProfile(
    userId: number,
    data: UpdateUserProfileData,
  ): Promise<UserProfile> {
    return this.prisma.msUser.update({
      where: { UserID: userId },
      data,
      include: USER_PROFILE_INCLUDE,
    });
  }

  replaceProfileRelations(
    userId: number,
    options: ReplaceProfileRelationsOptions,
  ) {
    return this.prisma.$transaction(async (tx) => {
      if (options.replacePhotos) {
        await tx.trUserPhoto.updateMany({
          where: { UserID: userId, Stsrc: 'A' },
          data: {
            Stsrc: 'D',
            UpdatedAt: new Date(),
            UpdatedBy: String(userId),
          },
        });

        if (options.photoRows.length) {
          await tx.trUserPhoto.createMany({ data: options.photoRows });
        }
      }

      if (options.replaceHobbies) {
        await tx.trUserHobby.deleteMany({
          where: { UserID: userId },
        });

        if (options.hobbyRows.length) {
          await tx.trUserHobby.createMany({ data: options.hobbyRows });
        }
      }

      return tx.msUser.update({
        where: { UserID: userId },
        data: options.data,
        include: USER_PROFILE_INCLUDE,
      });
    });
  }
}
