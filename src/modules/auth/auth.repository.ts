import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/user-client';
import { PrismaService } from '@/prisma/prisma.service';
import {
  USER_PROFILE_INCLUDE,
  type UserProfile,
} from '@/modules/user/user-profile.prisma';

@Injectable()
export class AuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string) {
    return this.prisma.msUser.findUnique({
      where: { Email: email },
    });
  }

  findByFirebaseUid(firebaseUid: string) {
    return this.prisma.msUser.findUnique({
      where: { FirebaseUID: firebaseUid },
    });
  }

  createUser(data: Prisma.MsUserUncheckedCreateInput): Promise<UserProfile> {
    return this.prisma.msUser.create({
      data,
      include: USER_PROFILE_INCLUDE,
    });
  }

  findActiveProfileByFirebaseUid(firebaseUid: string) {
    return this.prisma.msUser.findFirst({
      where: { FirebaseUID: firebaseUid, Stsrc: 'A' },
      include: USER_PROFILE_INCLUDE,
    });
  }

  findActiveProfileByEmail(email: string) {
    return this.prisma.msUser.findFirst({
      where: { Email: email, Stsrc: 'A' },
      include: USER_PROFILE_INCLUDE,
    });
  }

  linkFirebaseUid(userId: number, firebaseUid: string, updatedBy: string) {
    return this.prisma.msUser.update({
      where: { UserID: userId },
      data: {
        FirebaseUID: firebaseUid,
        UpdatedAt: new Date(),
        UpdatedBy: updatedBy,
      },
      include: USER_PROFILE_INCLUDE,
    });
  }
}
