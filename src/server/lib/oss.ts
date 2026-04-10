import crypto from 'crypto';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import dayjs from 'dayjs';

const client = new S3Client({
  endpoint: process.env['MINIO_ENDPOINT'],
  credentials: {
    accessKeyId: process.env['MINIO_ACCESS_KEY'] || '',
    secretAccessKey: process.env['MINIO_SECRET_KEY'] || ''
  },
  region: process.env['MINIO_REGION'] || '',
  forcePathStyle: true
});

export function uploadFileToMinio(key: string, body: Buffer) {
  return client.send(
    new PutObjectCommand({
      Bucket: process.env['MINIO_BUCKET'],
      Key: key,
      Body: body
    })
  );
}

// 获取图片访问链接
export async function getImageUrl(key: string) {
  const command = new GetObjectCommand({
    Bucket: process.env['MINIO_BUCKET'],
    Key: key
  });
  // 生成一个 1 小时后过期的链接
  return await getSignedUrl(client, command, {
    expiresIn: Number(process.env['IMAGE_EXPIRES_IN']) || 3600
  });
}

// 删除图片
export function deleteFileFromMinio(key: string) {
  return client.send(
    new DeleteObjectCommand({
      Bucket: process.env['MINIO_BUCKET'],
      Key: key
    })
  );
}

/**
 * 生成MinIO对象键名
 */
export function generateMinioKey({
  date,
  fileName,
  size = 'raw'
}: {
  date?: string;
  fileName: string;
  size?: 'small' | 'large' | 'raw';
}) {
  // 具体创建时间作为hash计算,确保同一文件再次上传覆盖操作
  const crtDate = dayjs(date || new Date()).format('YYYYMMDDHHmmss');
  const hash = crypto
    .createHash('md5')
    .update(crtDate.toString())
    .digest('hex')
    .slice(0, 8);
  const fileNameParts = fileName.split('.');

  // 生成示例: raw/20260401/a1b2c3d4.jpg
  return `${size}/${dayjs(date).format('YYYYMMDD')}/${fileNameParts[0]}_${hash}.${fileNameParts[1]}`;
}
