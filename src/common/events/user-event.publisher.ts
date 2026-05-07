import { Injectable, Logger } from '@nestjs/common';
import type {
  CampusEventPayload,
  CampusSyncSource,
  DepartmentEventPayload,
  DepartmentSyncSource,
  HobbyEventPayload,
  HobbySyncSource,
  UserEventPayload,
  UserSyncSource,
} from '@beefriends/shared-kernel';
import { PUBSUB_CHANNELS, PubSubService } from '../pub-sub';

@Injectable()
export class UserEventPublisher {
  private readonly logger = new Logger(UserEventPublisher.name);

  constructor(private readonly pubSub: PubSubService) {}

  async publishUserSynced(user: UserSyncSource) {
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

  async publishHobbySynced(hobby: HobbySyncSource) {
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

  async publishCampusSynced(campus: CampusSyncSource) {
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

  async publishDepartmentSynced(department: DepartmentSyncSource) {
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
