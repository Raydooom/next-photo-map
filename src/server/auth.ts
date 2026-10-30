import 'server-only';

import crypto from 'crypto';
import { cookies } from 'next/headers';

/** 管理端身份 cookie 名，与 middleware.ts 保持一致 */
export const ADMIN_COOKIE = 'admin_auth';

/**
 * 校验管理端身份。供 middleware 覆盖不到的入口使用（Server Action、API Route）。
 *
 * cookie 值直接与 ADMIN_PASSWORD 比对，有缺陷：泄露等同密码泄露、无过期、
 * 无法单独吊销。改签名 token 需配套登录页，见 REFACTOR.md 0.3。
 */
export async function isAdmin(): Promise<boolean> {
  // 开发环境放行，与 middleware 的行为保持一致
  if (process.env.NODE_ENV !== 'production') return true;

  const secret = process.env.ADMIN_PASSWORD;

  // 未配置密码时一律拒绝，避免 cookie 与 undefined 比较意外通过
  if (!secret) {
    console.error('[auth] ADMIN_PASSWORD 未配置，已拒绝管理端请求');
    return false;
  }

  const cookieStore = await cookies();
  return cookieStore.get(ADMIN_COOKIE)?.value === secret;
}

/**
 * 要求管理端身份，不满足则抛错。
 * 用于 Server Action —— 它们不经过 middleware，必须自行校验。
 */
export async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) {
    throw new Error('未授权');
  }
}

/**
 * 要求管理端身份，不满足则返回 401 响应。
 * 用于 API Route —— 返回响应比抛错更合适。
 */
export async function requireAdminResponse(): Promise<Response | null> {
  if (!(await isAdmin())) {
    return new Response(JSON.stringify({ error: '未授权' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  return null;
}

/**
 * 校验上传端共享密钥。供手机 App 等无登录态的客户端使用：
 * 请求头带 `Authorization: Bearer <UPLOAD_TOKEN>`，与环境变量恒定时间比对。
 *
 * 与管理端 cookie 是两条独立通道——上传不要求登录，但也不对公网裸奔。
 * 未配置 UPLOAD_TOKEN 时一律拒绝，避免与 undefined 比较意外放行。
 */
export function isUploadAuthorized(request: Request): boolean {
  const expected = process.env.UPLOAD_TOKEN;

  if (!expected) {
    console.error('[auth] UPLOAD_TOKEN 未配置，已拒绝上传请求');
    return false;
  }

  const header = request.headers.get('authorization') ?? '';
  const prefix = 'Bearer ';
  if (!header.startsWith(prefix)) return false;
  const provided = header.slice(prefix.length);

  // 长度不等时 timingSafeEqual 会抛错，先挡掉；长度本身不是秘密
  if (provided.length !== expected.length) return false;

  return crypto.timingSafeEqual(
    new Uint8Array(Buffer.from(provided)),
    new Uint8Array(Buffer.from(expected))
  );
}

/**
 * 要求上传端共享密钥，不满足则返回 401 响应。
 */
export function requireUploadResponse(request: Request): Response | null {
  if (!isUploadAuthorized(request)) {
    return new Response(JSON.stringify({ error: '未授权' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  return null;
}
