import { Injectable, Logger } from '@nestjs/common';
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { randomBytes } from 'node:crypto';

export interface StoredObject {
  buffer: Buffer;
  contentType: string;
  filename?: string;
}

/** Thin wrapper over an S3-compatible object store (MinIO in dev). */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly bucket = process.env.S3_BUCKET ?? 'rocket-artifacts';
  private readonly client = new S3Client({
    endpoint: process.env.S3_ENDPOINT ?? 'http://localhost:9000',
    region: process.env.S3_REGION ?? 'us-east-1',
    forcePathStyle: (process.env.S3_FORCE_PATH_STYLE ?? 'true') === 'true',
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY ?? 'rocketminio',
      secretAccessKey: process.env.S3_SECRET_KEY ?? 'rocketminio',
    },
  });

  async put(buffer: Buffer, contentType: string, filename: string): Promise<string> {
    const key = `uploads/${randomBytes(16).toString('hex')}`;
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        Metadata: { filename: encodeURIComponent(filename) },
      }),
    );
    return key;
  }

  async get(key: string): Promise<StoredObject> {
    const res = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
    const buffer = Buffer.from(await res.Body!.transformToByteArray());
    return {
      buffer,
      contentType: res.ContentType ?? 'application/octet-stream',
      filename: res.Metadata?.filename ? decodeURIComponent(res.Metadata.filename) : undefined,
    };
  }
}
