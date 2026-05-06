import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // 1. 只拦截 /admin 开头的路径
  if (request.nextUrl.pathname.startsWith('/admin')) {
    const authCookie = request.cookies.get('admin_auth')?.value;
    const secret = process.env.ADMIN_PASSWORD;

    // 2. 简单的 Token 校验（生产环境建议用 JWT 或更复杂的哈希）
    if (authCookie !== secret) {
      // 3. 校验失败，重定向到首页或 404
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return NextResponse.next();
}

// 匹配规则：只让中间件跑在 admin 相关路径上
export const config = {
  matcher: '/admin/:path*'
};
