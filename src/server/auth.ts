import 'server-only';

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
