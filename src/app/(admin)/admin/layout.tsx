import { redirect } from 'next/navigation';
import { isAdmin } from '@/server/auth';
import { AdminTabs } from './_components/AdminTabs';

/**
 * 管理端布局，同时作为服务端的第二道访问控制。
 *
 * middleware 已经拦了 /admin/:path*，这里再校验一次是为了防止单点失效 ——
 * matcher 是一个字符串配置，改错、漏改都不会有任何编译期提示。
 * 本 layout 是 Server Component，鉴权在渲染前完成，不会泄露页面内容。
 *
 * Tabs 导航需要 usePathname，拆到 _components/AdminTabs.tsx 作为客户端组件，
 * 这样 layout 本身能保持在服务端。
 */
export default async function AdminLayout({
  children
}: {
  children: React.ReactNode;
}) {
  if (!(await isAdmin())) {
    redirect('/');
  }

  return <AdminTabs>{children}</AdminTabs>;
}
