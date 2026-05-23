import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { Storage } from '@google-cloud/storage';
import { randomUUID } from 'crypto';
import { extname } from 'path';
import { Readable } from 'stream';
import { readFirebaseServiceAccount } from '@/config/firebase-admin';

export type UploadedBlob = {
  objectName: string;
  url: string;
};

@Injectable()
export class StorageService {
  private readonly gcsStorage?: Storage;
  private readonly s3Client?: S3Client;
  private readonly s3Endpoint?: string;
  private readonly bucketName: string;
  private readonly publicBaseUrl?: string;

  constructor(private readonly configService: ConfigService) {
    this.bucketName =
      this.configService.get<string>('RAILWAY_STORAGE_BUCKET') ??
      this.configService.get<string>('S3_BUCKET') ??
      this.configService.get<string>('AWS_S3_BUCKET') ??
      this.configService.get<string>('FIREBASE_STORAGE_BUCKET') ??
      this.configService.get<string>('GOOGLE_CLOUD_STORAGE_BUCKET') ??
      this.configService.get<string>('GCS_BUCKET_NAME') ??
      this.configService.get<string>('STORAGE_BUCKET') ??
      '';

    if (!this.bucketName) {
      throw new Error('Storage bucket is required');
    }

    this.publicBaseUrl = this.configService.get<string>('STORAGE_PUBLIC_URL');

    this.s3Endpoint =
      this.configService.get<string>('RAILWAY_STORAGE_ENDPOINT') ??
      this.configService.get<string>('S3_ENDPOINT') ??
      this.configService.get<string>('AWS_S3_ENDPOINT');
    const s3AccessKeyId =
      this.configService.get<string>('RAILWAY_STORAGE_ACCESS_KEY_ID') ??
      this.configService.get<string>('S3_ACCESS_KEY_ID') ??
      this.configService.get<string>('AWS_ACCESS_KEY_ID');
    const s3SecretAccessKey =
      this.configService.get<string>('RAILWAY_STORAGE_SECRET_ACCESS_KEY') ??
      this.configService.get<string>('S3_SECRET_ACCESS_KEY') ??
      this.configService.get<string>('AWS_SECRET_ACCESS_KEY');

    if (this.s3Endpoint && s3AccessKeyId && s3SecretAccessKey) {
      this.s3Client = new S3Client({
        endpoint: this.s3Endpoint,
        forcePathStyle: true,
        region:
          this.configService.get<string>('RAILWAY_STORAGE_REGION') ??
          this.configService.get<string>('S3_REGION') ??
          this.configService.get<string>('AWS_REGION') ??
          'auto',
        credentials: {
          accessKeyId: s3AccessKeyId,
          secretAccessKey: s3SecretAccessKey,
        },
      });
      return;
    }

    this.publicBaseUrl =
      this.publicBaseUrl ??
      this.configService.get<string>('GOOGLE_CLOUD_STORAGE_PUBLIC_URL');

    const firebaseCredential = readFirebaseServiceAccount()?.serviceAccount;
    const projectId =
      this.configService.get<string>('GOOGLE_CLOUD_PROJECT_ID') ??
      firebaseCredential?.project_id ??
      this.configService.get<string>('FIREBASE_PROJECT_ID');
    const clientEmail =
      this.configService.get<string>('GOOGLE_CLOUD_CLIENT_EMAIL') ??
      firebaseCredential?.client_email ??
      this.configService.get<string>('FIREBASE_CLIENT_EMAIL');
    const privateKey =
      this.configService
        .get<string>('GOOGLE_CLOUD_PRIVATE_KEY')
        ?.replace(/\\n/g, '\n') ??
      firebaseCredential?.private_key ??
      this.configService
        .get<string>('FIREBASE_PRIVATE_KEY')
        ?.replace(/\\n/g, '\n');

    this.gcsStorage =
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
    folder: 'profile' | 'gallery' | 'chat',
  ): Promise<UploadedBlob> {
    if (!file) {
      throw new BadRequestException('Photo file is required');
    }

    if (!file.mimetype?.startsWith('image/')) {
      throw new BadRequestException('Only image files are allowed');
    }

    const objectName = this.buildObjectName(userEmail, file, folder);

    if (this.s3Client) {
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: objectName,
          Body: file.buffer,
          ContentType: file.mimetype,
          CacheControl: 'public, max-age=31536000, immutable',
        }),
      );
    } else if (this.gcsStorage) {
      const bucketFile = this.gcsStorage
        .bucket(this.bucketName)
        .file(objectName);

      await bucketFile.save(file.buffer, {
        contentType: file.mimetype,
        resumable: false,
        metadata: {
          cacheControl: 'public, max-age=31536000, immutable',
        },
      });
    }

    return {
      objectName,
      url: this.getPublicUrl(objectName),
    };
  }

  async deleteUploadedBlobs(blobs: UploadedBlob[]) {
    await Promise.all(
      blobs.map((blob) => this.deleteUploadedBlob(blob).catch(() => undefined)),
    );
  }

  async getObject(objectName: string) {
    if (this.s3Client) {
      const object = await this.s3Client.send(
        new GetObjectCommand({
          Bucket: this.bucketName,
          Key: objectName,
        }),
      );

      return {
        body: object.Body as Readable,
        contentType: object.ContentType ?? 'application/octet-stream',
        cacheControl: object.CacheControl,
      };
    }

    const [metadata] = await this.gcsStorage
      .bucket(this.bucketName)
      .file(objectName)
      .getMetadata();
    const body = this.gcsStorage
      .bucket(this.bucketName)
      .file(objectName)
      .createReadStream();

    return {
      body,
      contentType: metadata.contentType ?? 'application/octet-stream',
      cacheControl: metadata.cacheControl,
    };
  }

  private buildObjectName(
    userEmail: string,
    file: Express.Multer.File,
    folder: 'profile' | 'gallery' | 'chat',
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

  private async deleteUploadedBlob(blob: UploadedBlob) {
    if (this.s3Client) {
      await this.s3Client.send(
        new DeleteObjectCommand({
          Bucket: this.bucketName,
          Key: blob.objectName,
        }),
      );
      return;
    }

    await this.gcsStorage
      ?.bucket(this.bucketName)
      .file(blob.objectName)
      .delete({ ignoreNotFound: true });
  }
}
