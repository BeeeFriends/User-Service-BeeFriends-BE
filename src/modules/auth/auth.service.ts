import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  FirebaseRegisterDto,
  FirebaseTokenLoginDto,
  LoginDto,
  RegisterDto,
} from '@beefriends/shared-kernel/dto';
import * as admin from 'firebase-admin';
import { UserEventPublisher } from '@common';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService, UploadedBlob } from '../storage/storage.service';

type RegisterUploadFiles = {
  profilePhoto?: Express.Multer.File[];
  photos?: Express.Multer.File[];
};

type FirebasePasswordLoginResponse = {
  localId?: string;
  email?: string;
  error?: {
    message?: string;
  };
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly storageService: StorageService,
    private readonly userEventPublisher: UserEventPublisher,
  ) {}

  async register(dto: FirebaseRegisterDto, files: RegisterUploadFiles = {}) {
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

      firebaseAccount = await this.resolveFirebaseUser(dto, profilePhoto.url);

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

      await this.userEventPublisher.publishUserSynced(user);
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
    const firebaseUser = await this.signInFirebaseUser(dto);
    const user = await this.findRegisteredFirebaseUser(
      firebaseUser.localId,
      firebaseUser.email ?? dto.binusianEmail,
    );
    if (!user) throw new UnauthorizedException('User is not registered yet');

    return this.issueToken(user);
  }

  async loginWithFirebase(dto: FirebaseTokenLoginDto) {
    const firebaseUser = await this.verifyFirebaseIdToken(dto.idToken);
    const user = await this.findRegisteredFirebaseUser(
      firebaseUser.uid,
      firebaseUser.email,
    );
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

  private async resolveFirebaseUser(
    dto: FirebaseRegisterDto,
    profilePhotoUrl: string,
  ) {
    if (dto.firebaseIdToken) {
      return this.useVerifiedFirebaseUser(dto, profilePhotoUrl);
    }

    if (!dto.password) {
      throw new BadRequestException(
        'Password or Firebase ID token is required',
      );
    }

    return this.createFirebaseUser(dto, profilePhotoUrl);
  }

  private async useVerifiedFirebaseUser(
    dto: FirebaseRegisterDto,
    profilePhotoUrl: string,
  ) {
    const decoded = await this.verifyFirebaseIdToken(dto.firebaseIdToken);
    const tokenEmail = decoded.email?.toLowerCase();
    const requestedEmail = dto.binusianEmail.toLowerCase();

    if (!decoded.uid || !tokenEmail) {
      throw new BadRequestException('Firebase token must include email');
    }

    if (tokenEmail !== requestedEmail) {
      throw new BadRequestException(
        'Firebase token email must match binusianEmail',
      );
    }

    const linkedUser = await this.prisma.msUser.findUnique({
      where: { FirebaseUID: decoded.uid },
    });
    if (linkedUser) {
      throw new ConflictException('Firebase account already registered');
    }

    const user = await admin.auth().updateUser(decoded.uid, {
      displayName: dto.displayName,
      photoURL: profilePhotoUrl,
    });

    return { user, created: false };
  }

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

  private async signInFirebaseUser(dto: LoginDto) {
    const apiKey =
      this.configService.get<string>('FIREBASE_WEB_API_KEY') ??
      this.configService.get<string>('FIREBASE_API_KEY');

    if (!apiKey) {
      throw new Error('Firebase web API key is required for password login');
    }

    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: dto.binusianEmail,
          password: dto.password,
          returnSecureToken: true,
        }),
      },
    );

    const body = (await response.json()) as FirebasePasswordLoginResponse;

    if (!response.ok || !body.localId) {
      throw new UnauthorizedException(
        this.getFirebaseLoginErrorMessage(body.error?.message),
      );
    }

    return {
      localId: body.localId,
      email: body.email,
    };
  }

  private async verifyFirebaseIdToken(idToken: string) {
    try {
      return await admin.auth().verifyIdToken(idToken);
    } catch {
      throw new UnauthorizedException('Firebase token is invalid or expired');
    }
  }

  private getFirebaseLoginErrorMessage(message?: string) {
    if (
      message === 'EMAIL_NOT_FOUND' ||
      message === 'INVALID_PASSWORD' ||
      message === 'INVALID_LOGIN_CREDENTIALS'
    ) {
      return 'Email or password is incorrect';
    }

    if (message === 'USER_DISABLED') {
      return 'This account is disabled';
    }

    return 'Could not log in';
  }

  private async findRegisteredFirebaseUser(
    firebaseUid?: string,
    email?: string,
  ) {
    if (!firebaseUid) return null;

    const byFirebaseUid = await this.prisma.msUser.findUnique({
      where: { FirebaseUID: firebaseUid },
      include: this.userInclude,
    });
    if (byFirebaseUid) return byFirebaseUid;

    if (!email) return null;

    const byEmail = await this.prisma.msUser.findUnique({
      where: { Email: email },
      include: this.userInclude,
    });
    if (!byEmail) return null;

    return this.prisma.msUser.update({
      where: { UserID: byEmail.UserID },
      data: {
        FirebaseUID: firebaseUid,
        UpdatedAt: new Date(),
        UpdatedBy: email,
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
