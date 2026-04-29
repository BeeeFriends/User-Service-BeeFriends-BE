import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Storage } from '@google-cloud/storage';
import { randomUUID } from 'crypto';
import { extname } from 'path';

export type UploadedBlob = {
  objectName: string;
  url: string;
};

@Injectable()
export class StorageService {
  private readonly storage: Storage;
  private readonly bucketName: string;
  private readonly publicBaseUrl?: string;

  constructor(private readonly configService: ConfigService) {
    this.bucketName =
      this.configService.get<string>('GOOGLE_CLOUD_STORAGE_BUCKET') ??
      this.configService.get<string>('GCS_BUCKET_NAME') ??
      this.configService.get<string>('STORAGE_BUCKET') ??
      '';

    if (!this.bucketName) {
      throw new Error('GOOGLE_CLOUD_STORAGE_BUCKET is required');
    }

    this.publicBaseUrl = this.configService.get<string>(
      'GOOGLE_CLOUD_STORAGE_PUBLIC_URL',
    );

    const projectId =
      this.configService.get<string>('GOOGLE_CLOUD_PROJECT_ID') ??
      this.configService.get<string>('FIREBASE_PROJECT_ID');
    const clientEmail =
      this.configService.get<string>('GOOGLE_CLOUD_CLIENT_EMAIL') ??
      this.configService.get<string>('FIREBASE_CLIENT_EMAIL');
    const privateKey =
      this.configService
        .get<string>('GOOGLE_CLOUD_PRIVATE_KEY')
        ?.replace(/\\n/g, '\n') ??
      this.configService
        .get<string>('FIREBASE_PRIVATE_KEY')
        ?.replace(/\\n/g, '\n');

    this.storage =
      projectId && clientEmail && privateKey
        ? new Storage({
            projectId,
            credentials: {
              client_email: clientEmail,
              private_key: privateKey,
            },
          })
        : new Storage({ projectId });
  }

  async uploadUserPhoto(
    userEmail: string,
    file: Express.Multer.File,
    folder: 'profile' | 'gallery',
  ): Promise<UploadedBlob> {
    if (!file) {
      throw new BadRequestException('Photo file is required');
    }

    if (!file.mimetype?.startsWith('image/')) {
      throw new BadRequestException('Only image files are allowed');
    }

    const objectName = this.buildObjectName(userEmail, file, folder);
    const bucketFile = this.storage.bucket(this.bucketName).file(objectName);

    await bucketFile.save(file.buffer, {
      contentType: file.mimetype,
      resumable: false,
      metadata: {
        cacheControl: 'public, max-age=31536000, immutable',
      },
    });

    return {
      objectName,
      url: this.getPublicUrl(objectName),
    };
  }

  async deleteUploadedBlobs(blobs: UploadedBlob[]) {
    await Promise.all(
      blobs.map((blob) =>
        this.storage
          .bucket(this.bucketName)
          .file(blob.objectName)
          .delete({ ignoreNotFound: true })
          .catch(() => undefined),
      ),
    );
  }

  private buildObjectName(
    userEmail: string,
    file: Express.Multer.File,
    folder: 'profile' | 'gallery',
  ) {
    const safeEmail = userEmail.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const extension =
      extname(file.originalname) || this.extensionFromMime(file);

    return `users/${safeEmail}/${folder}/${Date.now()}-${randomUUID()}${extension}`;
  }

  private extensionFromMime(file: Express.Multer.File) {
    const subtype = file.mimetype.split('/')[1]?.split('+')[0];
    return subtype ? `.${subtype}` : '';
  }

  private getPublicUrl(objectName: string) {
    if (this.publicBaseUrl) {
      return `${this.publicBaseUrl.replace(/\/$/, '')}/${objectName}`;
    }

    return `https://storage.googleapis.com/${this.bucketName}/${objectName}`;
  }
}
