import crypto from 'crypto';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import dayjs from 'dayjs';

export const client = new S3Client({
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

// 获取图片base64编码
export async function getImageBase64(key: string): Promise<string> {
  try {
    const command = new GetObjectCommand({
      Bucket: process.env['MINIO_BUCKET'],
      Key: key
    });

    const response = await client.send(command);
    // 将 Body 转换为 Uint8Array
    // response.Body 在 Node.js 环境下是 IncomingMessage 或流
    const transformToBuffer = async (stream: any): Promise<Buffer> => {
      return new Promise((resolve, reject) => {
        const chunks: any[] = [];
        stream.on('data', (chunk: any) => chunks.push(chunk));
        stream.on('error', reject);
        stream.on('end', () => resolve(Buffer.concat(chunks)));
      });
    };
    if (!response.Body) {
      throw new Error('Empty body received from S3');
    }
    const buffer = await transformToBuffer(response.Body);
    // 获取 MIME 类型（根据 key 后缀简单判断）
    const ext = key.split('.').pop()?.toLowerCase();
    const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';

    return `data:${mimeType};base64,${buffer.toString('base64')}`;
  } catch (error) {
    console.error('S3 Error:', error);
    throw error;
  }
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

// 检查 MinIO 中对象是否存在
export async function checkObjectExists(key: string): Promise<boolean> {
  try {
    await client.send(
      new HeadObjectCommand({
        Bucket: process.env['MINIO_BUCKET'],
        Key: key
      })
    );
    return true;
  } catch (error) {
    // 如果对象不存在，S3 SDK 会抛出 NoSuchKey 错误
    // 我们认为这种情况是正常的，返回 false
    console.log('MinIO object not found:', error);
    return false;
  }
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
