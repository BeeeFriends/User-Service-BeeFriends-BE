export type RegisterUploadFiles = {
  profilePhoto?: Express.Multer.File[];
  photos?: Express.Multer.File[];
};

export type FirebasePasswordLoginResponse = {
  localId?: string;
  email?: string;
  error?: {
    message?: string;
  };
};
