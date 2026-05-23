import type { Prisma } from '@prisma/user-client';

const MAX_GALLERY_PHOTOS = 3;

export function buildUserPhotoCreateRows(
  photoUrls: string[] = [],
  userId: number,
): Prisma.TrUserPhotoCreateManyInput[] {
  return uniqueGalleryUrls(photoUrls).map((photoUrl, index) => ({
    UserID: userId,
    PhotoUrl: photoUrl,
    SortOrder: index,
    IsProfile: false,
    Stsrc: 'A',
    CreatedAt: new Date(),
    CreatedBy: String(userId),
  }));
}

export function buildUserHobbyCreateRows(
  hobbyIds: number[],
  userId: number,
): Prisma.TrUserHobbyCreateManyInput[] {
  return uniqueHobbyIds(hobbyIds).map((hobbyId) => ({
    UserID: userId,
    HobbyID: hobbyId,
    Stsrc: 'A',
    CreatedAt: new Date(),
    CreatedBy: String(userId),
  }));
}

export function buildNestedUserPhotoCreates(
  photoUrls: string[] = [],
  createdBy: string,
) {
  return uniqueGalleryUrls(photoUrls).map((photoUrl, index) => ({
    PhotoUrl: photoUrl,
    SortOrder: index,
    IsProfile: false,
    Stsrc: 'A',
    CreatedAt: new Date(),
    CreatedBy: createdBy,
  }));
}

export function buildNestedUserHobbyCreates(
  hobbyIds: number[],
  createdBy: string,
) {
  return uniqueHobbyIds(hobbyIds).map((hobbyId) => ({
    hobby: { connect: { HobbyID: hobbyId } },
    Stsrc: 'A',
    CreatedAt: new Date(),
    CreatedBy: createdBy,
  }));
}

function uniqueGalleryUrls(photoUrls: string[]) {
  return Array.from(new Set(photoUrls)).slice(0, MAX_GALLERY_PHOTOS);
}

function uniqueHobbyIds(hobbyIds: number[]) {
  return Array.from(new Set(hobbyIds));
}
