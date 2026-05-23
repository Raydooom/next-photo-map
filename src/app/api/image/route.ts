import { NextRequest, NextResponse } from 'next/server';
import { internalClient, BUCKET } from '@/server/lib/oss';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

// Token 有效期：7 天（单位：秒）
const TOKEN_EXPIRES_IN = 7 * 24 * 60 * 60;
// Token 签名密钥（生产环境应使用环境变量）
const TOKEN_SECRET = process.env.IMAGE_TOKEN_SECRET || 'photo-map-image-secret';

/**
 * 生成图片访问 Token
 * 格式: base64(JSON.stringify({key, exp, sign}))
 */
export function generateImageToken(key: string): string {
  const exp = Math.floor(Date.now() / 1000) + TOKEN_EXPIRES_IN;
  const payload = { key, exp };
  const sign = crypto
    .createHmac('sha256', TOKEN_SECRET)
    .update(`${key}:${exp}`)
    .digest('hex')
    .slice(0, 16);

  const tokenData = { ...payload, sign };
  return Buffer.from(JSON.stringify(tokenData)).toString('base64url');
}

/**
 * 验证图片访问 Token
 */
function verifyImageToken(token: string): {
  valid: boolean;
  key?: string;
  error?: string;
} {
  try {
    const decoded = JSON.parse(Buffer.from(token, 'base64url').toString());
    const { key, exp, sign } = decoded;

    // 检查过期
    if (exp < Math.floor(Date.now() / 1000)) {
      return { valid: false, error: 'Token 已过期' };
    }

    // 验证签名
    const expectedSign = crypto
      .createHmac('sha256', TOKEN_SECRET)
      .update(`${key}:${exp}`)
      .digest('hex')
      .slice(0, 16);

    if (sign !== expectedSign) {
      return { valid: false, error: 'Token 无效' };
    }

    return { valid: true, key };
  } catch {
    return { valid: false, error: 'Token 格式错误' };
  }
}

/**
 * 图片代理接口
 *
 * 两种访问方式：
 * 1. /api/image?key=xxx&token=yyy  - 带 Token 验证（推荐）
 * 2. /api/image?key=xxx            - 无 Token（仅限服务端调用）
 *
 * Token 由后端生成，有效期 7 天
 * 浏览器可缓存 7 天
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get('key');
  const token = searchParams.get('token');

  if (!key) {
    return NextResponse.json({ error: '缺少 key 参数' }, { status: 400 });
  }

  // 如果有 token，验证 token
  if (token) {
    const { valid, error } = verifyImageToken(token);
    if (!valid) {
      return NextResponse.json({ error }, { status: 403 });
    }
  }

  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET,
      Key: key
    });

    // 使用内网客户端读取图片
    const response = await internalClient.send(command);

    const body = await response.Body?.transformToByteArray();

    if (!body) {
      return NextResponse.json({ error: '图片不存在' }, { status: 404 });
    }

    const contentType = response.ContentType || getContentType(key);

    // 设置缓存头：浏览器缓存 7 天
    return new NextResponse(body as any, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': `public, max-age=${TOKEN_EXPIRES_IN}, immutable`,
        ETag: `"${Buffer.from(key).toString('base64')}"`
      }
    });
  } catch (error) {
    console.error('获取图片失败:', error);
    return NextResponse.json({ error: '获取图片失败' }, { status: 500 });
  }
}

function getContentType(key: string): string {
  const ext = key.split('.').pop()?.toLowerCase();
  const mimeTypes: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    gif: 'image/gif',
    mp4: 'video/mp4',
    mov: 'video/quicktime'
  };
  return mimeTypes[ext || ''] || 'application/octet-stream';
}
