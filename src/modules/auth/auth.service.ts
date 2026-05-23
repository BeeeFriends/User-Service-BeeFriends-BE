// Modules
import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as admin from 'firebase-admin';
import { ProfileReferenceService, UserEventPublisher } from '@common';

// DTO
import {
  FirebaseRegisterDto,
  FirebaseTokenLoginDto,
  LoginDto,
  RegisterDto,
} from '@beefriends/shared-kernel/dto';

// Service
import {
  StorageService,
  UploadedBlob,
} from '@/modules/storage/storage.service';
import { AuthRepository } from '@/modules/auth/auth.repository';
import { toProfileResponse } from '@/modules/user/user-profile.mapper';
import type { UserProfile } from '@/modules/user/user-profile.prisma';

// Types
import type {
  RegisterUploadFiles,
  FirebasePasswordLoginResponse,
} from '@/types/auth.type';

@Injectable()
export class AuthService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly storageService: StorageService,
    private readonly userEventPublisher: UserEventPublisher,
    private readonly profileReferenceService: ProfileReferenceService,
  ) {}

  async register(dto: FirebaseRegisterDto, files: RegisterUploadFiles = {}) {
    const existing = await this.authRepository.findByEmail(dto.binusianEmail);
    if (existing) throw new ConflictException('Email already registered');

    await this.profileReferenceService.ensureCampusExists(dto.campusId);
    await this.profileReferenceService.ensureMajorExists(dto.majorId);
    await this.profileReferenceService.ensureHobbiesExist(dto.hobbyIds);

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

      const user = await this.authRepository.createUser({
        Username: dto.displayName,
        Email: dto.binusianEmail,
        FirebaseUID: firebaseAccount.user.uid,
        PhoneNumber: dto.phoneNumber,
        Gender: dto.gender,
        Age: dto.age,
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
            galleryPhotos.map((photo) => photo.url),
            dto.binusianEmail,
          ),
        },
        hobbies: {
          create: this.buildHobbyRows(dto.hobbyIds, dto.binusianEmail),
        },
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

    const linkedUser = await this.authRepository.findByFirebaseUid(decoded.uid);
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
        const linkedUser = await this.authRepository.findByFirebaseUid(
          firebaseUser.uid,
        );
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

    const byFirebaseUid =
      await this.authRepository.findActiveProfileByFirebaseUid(firebaseUid);
    if (byFirebaseUid) return byFirebaseUid;

    if (!email) return null;

    const byEmail = await this.authRepository.findActiveProfileByEmail(email);
    if (!byEmail) return null;

    return this.authRepository.linkFirebaseUid(
      byEmail.UserID,
      firebaseUid,
      email,
    );
  }

  private buildPhotoRows(photoUrls: string[] = [], createdBy: string) {
    const uniqueUrls = Array.from(new Set(photoUrls)).slice(0, 3);

    return uniqueUrls.map((photoUrl, index) => ({
      PhotoUrl: photoUrl,
      SortOrder: index,
      IsProfile: false,
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

  private issueToken(user: UserProfile) {
    const payload = {
      sub: user.UserID,
      username: user.Username,
      email: user.Email,
    };
    return {
      access_token: this.jwtService.sign(payload),
      user: toProfileResponse(user),
    };
  }
}
