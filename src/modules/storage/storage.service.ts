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

const STORAGE_ROUTE_PREFIX = '/storage/';

type StoredObject = {
  body: Readable;
  contentType: string;
  cacheControl?: string;
};

interface ObjectStorageProvider {
  upload(objectName: string, file: Express.Multer.File): Promise<void>;
  get(objectName: string): Promise<StoredObject>;
  delete(objectName: string): Promise<void>;
}

class S3ObjectStorageProvider implements ObjectStorageProvider {
  constructor(
    private readonly s3Client: S3Client,
    private readonly bucketName: string,
  ) {}

  async upload(objectName: string, file: Express.Multer.File) {
    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: objectName,
        Body: file.buffer,
        ContentType: file.mimetype,
        CacheControl: 'public, max-age=31536000, immutable',
      }),
    );
  }

  async get(objectName: string) {
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

  async delete(objectName: string) {
    await this.s3Client.send(
      new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: objectName,
      }),
    );
  }
}

class GcsObjectStorageProvider implements ObjectStorageProvider {
  constructor(
    private readonly gcsStorage: Storage,
    private readonly bucketName: string,
  ) {}

  async upload(objectName: string, file: Express.Multer.File) {
    const bucketFile = this.gcsStorage.bucket(this.bucketName).file(objectName);

    await bucketFile.save(file.buffer, {
      contentType: file.mimetype,
      resumable: false,
      metadata: {
        cacheControl: 'public, max-age=31536000, immutable',
      },
    });
  }

  async get(objectName: string) {
    const bucketFile = this.gcsStorage.bucket(this.bucketName).file(objectName);
    const [metadata] = await bucketFile.getMetadata();

    return {
      body: bucketFile.createReadStream(),
      contentType: metadata.contentType ?? 'application/octet-stream',
      cacheControl: metadata.cacheControl,
    };
  }

  async delete(objectName: string) {
    await this.gcsStorage
      .bucket(this.bucketName)
      .file(objectName)
      .delete({ ignoreNotFound: true });
  }
}

@Injectable()
export class StorageService {
  private readonly provider: ObjectStorageProvider;
  private readonly bucketName: string;

  constructor(private readonly configService: ConfigService) {
    this.bucketName = this.resolveBucketName();

    if (!this.bucketName) {
      throw new Error('Storage bucket is required');
    }

    this.provider = this.createStorageProvider();
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
    await this.provider.upload(objectName, file);

    return {
      objectName,
      url: getStoragePublicPath(objectName),
    };
  }

  async deleteUploadedBlobs(blobs: UploadedBlob[]) {
    await Promise.all(
      blobs.map((blob) => this.deleteUploadedBlob(blob).catch(() => undefined)),
    );
  }

  async getObject(objectName: string) {
    return this.provider.get(objectName);
  }

  private createStorageProvider(): ObjectStorageProvider {
    const s3Provider = this.createS3Provider();
    if (s3Provider) return s3Provider;

    return new GcsObjectStorageProvider(
      this.createGcsStorage(),
      this.bucketName,
    );
  }

  private createS3Provider() {
    const endpoint =
      this.configService.get<string>('RAILWAY_STORAGE_ENDPOINT') ??
      this.configService.get<string>('S3_ENDPOINT') ??
      this.configService.get<string>('AWS_S3_ENDPOINT');
    const accessKeyId =
      this.configService.get<string>('RAILWAY_STORAGE_ACCESS_KEY_ID') ??
      this.configService.get<string>('S3_ACCESS_KEY_ID') ??
      this.configService.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey =
      this.configService.get<string>('RAILWAY_STORAGE_SECRET_ACCESS_KEY') ??
      this.configService.get<string>('S3_SECRET_ACCESS_KEY') ??
      this.configService.get<string>('AWS_SECRET_ACCESS_KEY');

    if (!endpoint || !accessKeyId || !secretAccessKey) return null;

    const s3Client = new S3Client({
      endpoint,
      forcePathStyle: true,
      region:
        this.configService.get<string>('RAILWAY_STORAGE_REGION') ??
        this.configService.get<string>('S3_REGION') ??
        this.configService.get<string>('AWS_REGION') ??
        'auto',
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    return new S3ObjectStorageProvider(s3Client, this.bucketName);
  }

  private createGcsStorage() {
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

    if (projectId && clientEmail && privateKey) {
      return new Storage({
        projectId,
        credentials: {
          client_email: clientEmail,
          private_key: privateKey,
        },
      });
    }

    return new Storage({ projectId });
  }

  private resolveBucketName() {
    return (
      this.configService.get<string>('RAILWAY_STORAGE_BUCKET') ??
      this.configService.get<string>('S3_BUCKET') ??
      this.configService.get<string>('AWS_S3_BUCKET') ??
      this.configService.get<string>('FIREBASE_STORAGE_BUCKET') ??
      this.configService.get<string>('GOOGLE_CLOUD_STORAGE_BUCKET') ??
      this.configService.get<string>('GCS_BUCKET_NAME') ??
      this.configService.get<string>('STORAGE_BUCKET') ??
      ''
    );
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

  private async deleteUploadedBlob(blob: UploadedBlob) {
    await this.provider.delete(blob.objectName);
  }
}

export function getStoragePublicPath(objectName: string) {
  return `${STORAGE_ROUTE_PREFIX}${objectName.replace(/^\/+/, '')}`;
}

export function normalizeStorageUrl(value?: string | null) {
  const raw = value?.trim();
  if (!raw) return '';

  if (raw.startsWith(STORAGE_ROUTE_PREFIX)) return raw;
  if (raw.startsWith('/users/'))
    return `${STORAGE_ROUTE_PREFIX}${raw.slice(1)}`;
  if (raw.startsWith('users/')) return getStoragePublicPath(raw);

  try {
    const parsed = new URL(raw);
    const storageIndex = parsed.pathname.indexOf(STORAGE_ROUTE_PREFIX);

    if (storageIndex !== -1) {
      return decodeURIComponent(parsed.pathname.slice(storageIndex));
    }
  } catch {
    return raw;
  }

  return raw;
}
