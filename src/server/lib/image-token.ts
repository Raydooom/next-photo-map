import crypto from 'crypto';

// Token 有效期：7 天（单位：秒）
export const TOKEN_EXPIRES_IN = 7 * 24 * 60 * 60;
// Token 签名密钥
const TOKEN_SECRET = process.env.IMAGE_TOKEN_SECRET || 'photo-map-image-secret';

/**
 * 计算过期时间戳（对齐到 7 天边界）
 *
 * 例如：现在是第 3 天，过期时间 = 第 7 天末
 * 这样在同一个 7 天周期内，生成的 token 始终相同
 */
function calculateExpTimestamp(): number {
  const now = Math.floor(Date.now() / 1000);
  // 计算当前是第几个 7 天周期，然后 +1 作为过期时间
  const periodIndex = Math.floor(now / TOKEN_EXPIRES_IN);
  return (periodIndex + 1) * TOKEN_EXPIRES_IN;
}

/**
 * 生成图片访问 Token
 *
 * 策略：使用固定时间窗口，7 天内的 token 保持一致
 * - 同一个 key 在同一个 7 天周期内生成相同 token
 * - 浏览器可以缓存 7 天
 * - 7 天后 token 失效，需要重新获取
 */
export function generateImageToken(key: string): string {
  const exp = calculateExpTimestamp();
  const sign = crypto
    .createHmac('sha256', TOKEN_SECRET)
    .update(`${key}:${exp}`)
    .digest('hex')
    .slice(0, 16);

  const tokenData = { key, exp, sign };
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
