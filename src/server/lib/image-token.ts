import crypto from 'crypto';

// Token 有效期：7 天（单位：秒）
export const TOKEN_EXPIRES_IN = 7 * 24 * 60 * 60;
// Token 签名密钥
const TOKEN_SECRET = process.env.IMAGE_TOKEN_SECRET || 'photo-map-image-secret';

/**
 * 生成图片访问 Token
 * 格式: base64url(JSON.stringify({key, exp, sign}))
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
export function verifyImageToken(token: string): {
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
