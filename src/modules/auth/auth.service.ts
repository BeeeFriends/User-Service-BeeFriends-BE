import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { LoginDto, RegisterDto } from '@beefriends/shared-kernel/dto';
import * as admin from 'firebase-admin';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService, UploadedBlob } from '../storage/storage.service';

type RegisterUploadFiles = {
  profilePhoto?: Express.Multer.File[];
  photos?: Express.Multer.File[];
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly storageService: StorageService,
  ) {}

  async register(dto: RegisterDto, files: RegisterUploadFiles = {}) {
    const existing = await this.prisma.msUser.findUnique({
      where: { Email: dto.binusianEmail },
    });
    if (existing) throw new ConflictException('Email already registered');

    await this.ensureCampusExists(dto.campusId);
    await this.ensureMajorExists(dto.majorId);
    await this.ensureHobbiesExist(dto.hobbyIds);

    const profilePhotoFile = files.profilePhoto?.[0];
    if (!profilePhotoFile) {
      throw new BadRequestException('Profile photo is required');
    }

    const uploadedBlobs: UploadedBlob[] = [];
    let firebaseAccount:
      | Awaited<ReturnType<typeof this.createFirebaseUser>>
      | undefined;

    try {
      const profilePhoto = await this.storageService.uploadUserPhoto(
        dto.binusianEmail,
        profilePhotoFile,
        'profile',
      );
      uploadedBlobs.push(profilePhoto);

      const galleryPhotos = await Promise.all(
        (files.photos ?? []).map((photo) =>
          this.storageService.uploadUserPhoto(
            dto.binusianEmail,
            photo,
            'gallery',
          ),
        ),
      );
      uploadedBlobs.push(...galleryPhotos);

      firebaseAccount = await this.createFirebaseUser(dto, profilePhoto.url);

      const user = await this.prisma.msUser.create({
        data: {
          Username: dto.displayName,
          Email: dto.binusianEmail,
          FirebaseUID: firebaseAccount.user.uid,
          PhoneNumber: dto.phoneNumber,
          ProfilePhotoUrl: profilePhoto.url,
          Description: dto.description ?? '',
          CampusID: dto.campusId,
          DepartmentID: dto.majorId,
          CodeYear: dto.binusianYear,
          Stsrc: 'A',
          CreatedAt: new Date(),
          CreatedBy: dto.binusianEmail,
          photos: {
            create: this.buildPhotoRows(
              profilePhoto.url,
              galleryPhotos.map((photo) => photo.url),
              dto.binusianEmail,
            ),
          },
          hobbies: {
            create: this.buildHobbyRows(dto.hobbyIds, dto.binusianEmail),
          },
        },
        include: this.userInclude,
      });

      return this.issueToken(user);
    } catch (error) {
      if (firebaseAccount?.created) {
        await admin
          .auth()
          .deleteUser(firebaseAccount.user.uid)
          .catch(() => undefined);
      }
      await this.storageService.deleteUploadedBlobs(uploadedBlobs);
      throw error;
    }
  }

  async login(dto: LoginDto) {
    const decoded = await admin.auth().verifyIdToken(dto.idToken);
    const user = await this.findRegisteredFirebaseUser(decoded);
    if (!user) throw new UnauthorizedException('User is not registered yet');

    return this.issueToken(user);
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

  private async createFirebaseUser(dto: RegisterDto, profilePhotoUrl: string) {
    try {
      const user = await admin.auth().createUser({
        email: dto.binusianEmail,
        password: dto.password,
        displayName: dto.displayName,
        photoURL: profilePhotoUrl,
      });
      return { user, created: true };
    } catch (error: any) {
      if (error?.code !== 'auth/email-already-exists') {
        throw error;
      }

      const firebaseUser = await admin.auth().getUserByEmail(dto.binusianEmail);
      if (firebaseUser.uid) {
        const linkedUser = await this.prisma.msUser.findUnique({
          where: { FirebaseUID: firebaseUser.uid },
        });
        if (linkedUser) {
          throw new ConflictException('Email already registered');
        }
      }

      const user = await admin.auth().updateUser(firebaseUser.uid, {
        password: dto.password,
        displayName: dto.displayName,
        photoURL: profilePhotoUrl,
      });
      return { user, created: false };
    }
  }

  private async findRegisteredFirebaseUser(decoded: admin.auth.DecodedIdToken) {
    const byFirebaseUid = await this.prisma.msUser.findUnique({
      where: { FirebaseUID: decoded.uid },
      include: this.userInclude,
    });
    if (byFirebaseUid) return byFirebaseUid;

    if (!decoded.email) return null;

    const byEmail = await this.prisma.msUser.findUnique({
      where: { Email: decoded.email },
      include: this.userInclude,
    });
    if (!byEmail) return null;

    return this.prisma.msUser.update({
      where: { UserID: byEmail.UserID },
      data: {
        FirebaseUID: decoded.uid,
        UpdatedAt: new Date(),
        UpdatedBy: decoded.email,
      },
      include: this.userInclude,
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
    createdBy: string,
  ) {
    const uniqueUrls = Array.from(new Set([profilePhotoUrl, ...photoUrls]));

    return uniqueUrls.map((photoUrl, index) => ({
      PhotoUrl: photoUrl,
      SortOrder: index,
      IsProfile: photoUrl === profilePhotoUrl,
      Stsrc: 'A',
      CreatedAt: new Date(),
      CreatedBy: createdBy,
    }));
  }

  private buildHobbyRows(hobbyIds: number[], createdBy: string) {
    return Array.from(new Set(hobbyIds)).map((hobbyId) => ({
      hobby: { connect: { HobbyID: hobbyId } },
      Stsrc: 'A',
      CreatedAt: new Date(),
      CreatedBy: createdBy,
    }));
  }

  private issueToken(user: any) {
    const payload = {
      sub: user.UserID,
      username: user.Username,
      email: user.Email,
    };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
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
      },
    };
  }
}
