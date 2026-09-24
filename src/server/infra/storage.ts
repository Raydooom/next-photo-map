import 'server-only';

import crypto from 'crypto';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand
} from '@aws-sdk/client-s3';
import dayjs from 'dayjs';
import { generateImageToken } from '@/server/infra/image-token';

// 只需内网客户端：图片对外走 /api/image 代理 + HMAC token，不生成 presigned URL
const INTERNAL_ENDPOINT =
  process.env.MINIO_INTERNAL_ENDPOINT || 'http://photo-map-minio:9000';

export const internalClient = new S3Client({
  endpoint: INTERNAL_ENDPOINT,
  credentials: {
    accessKeyId: process.env.MINIO_ACCESS_KEY || '',
    secretAccessKey: process.env.MINIO_SECRET_KEY || ''
  },
  region: process.env.MINIO_REGION || '',
  forcePathStyle: true
});

export const BUCKET = process.env.MINIO_BUCKET || '';

// ============ 上传操作（走内网） ============

export function uploadFileToMinio(key: string, body: Buffer) {
  return internalClient.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: body
    })
  );
}

export function deleteFileFromMinio(key: string) {
  return internalClient.send(
    new DeleteObjectCommand({
      Bucket: BUCKET,
      Key: key
    })
  );
}

export async function checkObjectExists(key: string): Promise<boolean> {
  try {
    await internalClient.send(
      new HeadObjectCommand({
        Bucket: BUCKET,
        Key: key
      })
    );
    return true;
  } catch {
    return false;
  }
}

// ============ 读取操作（走内网） ============

export async function getImageBase64(
  key: string,
  contentType?: string
): Promise<string> {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET,
      Key: key
    });

    const response = await internalClient.send(command);

    if (!response.Body) {
      throw new Error('Empty body received from S3');
    }

    const buffer = await streamToBuffer(response.Body as any);
    const ext = key.split('.').pop()?.toLowerCase();
    const inferredMimeType = ext === 'png' ? 'image/png' : 'image/jpeg';

    return `data:${contentType || inferredMimeType};base64,${buffer.toString('base64')}`;
  } catch (error) {
    console.error('S3 Error:', error);
    throw error;
  }
}

// ============ 签名 URL（走外网） ============

export function getImageUrl(key: string): string {
  // 使用代理接口 + Token（支持长期缓存）
  const token = generateImageToken(key);
  const baseUrl = process.env.APP_URL || '';
  return `${baseUrl}/api/image?key=${encodeURIComponent(key)}&token=${token}`;
}

// ============ 辅助函数 ============

function streamToBuffer(stream: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: any[] = [];
    stream.on('data', (chunk: any) => chunks.push(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks)));
  });
}

export function generateMinioKey({
  date,
  fileName,
  size = 'raw'
}: {
  date?: string;
  fileName: string;
  size?: 'small' | 'large' | 'raw';
}) {
  const crtDate = dayjs(date || new Date()).format('YYYYMMDDHHmmss');
  const hash = crypto
    .createHash('md5')
    .update(crtDate.toString())
    .digest('hex')
    .slice(0, 8);
  const fileNameParts = fileName.split('.');

  return `${size}/${dayjs(date).format('YYYYMMDD')}/${fileNameParts[0]}_${hash}.${fileNameParts[1]}`;
}
