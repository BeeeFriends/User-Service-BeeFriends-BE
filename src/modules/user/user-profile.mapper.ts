import type { UserProfile } from '@/modules/user/user-profile.prisma';

export function toProfileResponse(user: UserProfile) {
  return {
    id: user.UserID,
    displayName: user.Username,
    binusianEmail: user.Email,
    phoneNumber: user.PhoneNumber,
    gender: user.Gender,
    age: user.Age,
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
