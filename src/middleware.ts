import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * 管理端访问控制，覆盖页面与 /api 下的管理接口。
 *
 * 只是第一道防线：Server Action 不走 middleware，
 * 故 (admin)/admin/_actions.ts 里每个导出仍需自行 requireAdmin()。
 */
export function middleware(request: NextRequest) {
  if (process.env.NODE_ENV !== 'production') {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;

  // 上传接口自带共享密钥鉴权（Authorization: Bearer），不走管理端 cookie。
  // 放行给路由内的 requireUploadResponse() 处理，否则手机 App 会被这里先拦成 401。
  if (pathname === '/api/admin/upload') {
    return NextResponse.next();
  }

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
