import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * 管理端访问控制。
 *
 * 覆盖范围除页面外还包括 /api/admin 与 /api/ai —— 之前 matcher 只写了
 * '/admin/:path*'，而真正执行操作的接口在 /api 下，完全没有经过校验。
 *
 * 注意 middleware 只是第一道防线：Server Action 不走 middleware，
 * 因此 app/admin/_actions.ts 里每个导出都还要自行调 requireAdmin()。
 */
export function middleware(request: NextRequest) {
  if (process.env.NODE_ENV !== 'production') {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;
  const authCookie = request.cookies.get('admin_auth')?.value;
  const secret = process.env.ADMIN_PASSWORD;

  // 未配置密码时一律拒绝，避免 cookie 与 undefined 比较意外通过
  const authorized = Boolean(secret) && authCookie === secret;

  if (authorized) {
    return NextResponse.next();
  }

  // 接口返回 401，页面重定向到首页
  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: '未授权' }, { status: 401 });
  }

  return NextResponse.redirect(new URL('/', request.url));
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*', '/api/ai/analysis']
};
