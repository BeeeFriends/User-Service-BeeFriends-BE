import type { Prisma } from '@prisma/user-client';

export const USER_PROFILE_INCLUDE = {
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
} satisfies Prisma.MsUserInclude;

export type UserProfile = Prisma.MsUserGetPayload<{
  include: typeof USER_PROFILE_INCLUDE;
}>;
