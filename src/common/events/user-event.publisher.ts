import { Injectable, Logger } from '@nestjs/common';
import type {
  CampusEventPayload,
  DepartmentEventPayload,
  HobbyEventPayload,
  UserEventPayload,
} from '@beefriends/shared-kernel';
import { PUBSUB_CHANNELS, PubSubService } from '../pub-sub';

type UserLike = {
  UserID: number;
  Username?: string | null;
  Email?: string | null;
  PhoneNumber?: string | null;
  Gender?: string | null;
  Age?: number | null;
  CodeYear?: number | null;
  Description?: string | null;
  ProfilePhotoUrl?: string | null;
  CampusID?: number | null;
  DepartmentID?: number | null;
  campus?: {
    CampusID?: number | null;
    CampusName?: string | null;
    CampusAddress?: string | null;
  } | null;
  department?: {
    DepartmentID?: number | null;
    DepartmentName?: string | null;
  } | null;
  hobbies?: {
    HobbyID?: number | null;
    hobby?: {
      HobbyID?: number | null;
      HobbyName?: string | null;
    } | null;
  }[];
  photos?: {
    UserPhotoID?: number | null;
    PhotoUrl?: string | null;
    SortOrder?: number | null;
    IsProfile?: boolean | null;
  }[];
};

type HobbyLike = {
  HobbyID: number;
  HobbyName: string;
};

type CampusLike = {
  CampusID: number;
  CampusName: string;
  CampusAddress?: string | null;
};

type DepartmentLike = {
  DepartmentID: number;
  DepartmentName: string;
};

@Injectable()
export class UserEventPublisher {
  private readonly logger = new Logger(UserEventPublisher.name);

  constructor(private readonly pubSub: PubSubService) {}

  async publishUserSynced(user: UserLike) {
    try {
      const payload = {
        type: 'user.synced',
        user: {
          id: user.UserID,
          displayName: user.Username,
          binusianEmail: user.Email,
          phoneNumber: user.PhoneNumber,
          gender: user.Gender,
          age: user.Age,
          binusianYear: user.CodeYear,
          description: user.Description,
          profilePhotoUrl: user.ProfilePhotoUrl,
          campusId: user.CampusID ?? user.campus?.CampusID,
          campusName: user.campus?.CampusName,
          campusAddress: user.campus?.CampusAddress,
          majorId: user.DepartmentID ?? user.department?.DepartmentID,
          majorName: user.department?.DepartmentName,
          hobbies:
            user.hobbies
              ?.map((userHobby) => ({
                id: userHobby.hobby?.HobbyID ?? userHobby.HobbyID,
                name: userHobby.hobby?.HobbyName,
              }))
              .filter((hobby) => hobby.id && hobby.name) ?? [],
          photos:
            user.photos
              ?.map((photo) => ({
                id: photo.UserPhotoID,
                url: photo.PhotoUrl,
                sortOrder: photo.SortOrder ?? 0,
                isProfile: photo.IsProfile ?? false,
              }))
              .filter((photo) => photo.id && photo.url) ?? [],
        },
        timestamp: new Date().toISOString(),
      } satisfies UserEventPayload;

      await this.pubSub.publish(PUBSUB_CHANNELS.USER_EVENTS, payload);
    } catch (error) {
      this.logger.warn(
        `Failed to publish user ${user.UserID}: ${(error as Error).message}`,
      );
    }
  }

  async publishHobbySynced(hobby: HobbyLike) {
    try {
      const payload = {
        type: 'hobby.synced',
        hobby: {
          id: hobby.HobbyID,
          name: hobby.HobbyName,
        },
        timestamp: new Date().toISOString(),
      } satisfies HobbyEventPayload;

      await this.pubSub.publish(PUBSUB_CHANNELS.HOBBY_EVENTS, payload);
    } catch (error) {
      this.logger.warn(
        `Failed to publish hobby ${hobby.HobbyID}: ${(error as Error).message}`,
      );
    }
  }

  async publishCampusSynced(campus: CampusLike) {
    try {
      const payload = {
        type: 'campus.synced',
        campus: {
          id: campus.CampusID,
          name: campus.CampusName,
          address: campus.CampusAddress,
        },
        timestamp: new Date().toISOString(),
      } satisfies CampusEventPayload;

      await this.pubSub.publish(PUBSUB_CHANNELS.CAMPUS_EVENTS, payload);
    } catch (error) {
      this.logger.warn(
        `Failed to publish campus ${campus.CampusID}: ${
          (error as Error).message
        }`,
      );
    }
  }

  async publishDepartmentSynced(department: DepartmentLike) {
    try {
      const payload = {
        type: 'department.synced',
        department: {
          id: department.DepartmentID,
          name: department.DepartmentName,
        },
        timestamp: new Date().toISOString(),
      } satisfies DepartmentEventPayload;

      await this.pubSub.publish(PUBSUB_CHANNELS.DEPARTMENT_EVENTS, payload);
    } catch (error) {
      this.logger.warn(
        `Failed to publish department ${department.DepartmentID}: ${
          (error as Error).message
        }`,
      );
    }
  }
}
