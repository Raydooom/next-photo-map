import { redirect } from 'next/navigation';
import { isAdmin } from '@/server/auth';
import { AdminTabs } from './_components/AdminTabs';

/**
 * 管理端布局，兼作服务端的第二道访问控制。
 *
 * middleware 的 matcher 是字符串配置，改错漏改都没有编译期提示，
 * 故此处再校验一次。鉴权在渲染前完成，不会泄露页面内容。
 * Tabs 需要 usePathname，拆到 AdminTabs 里，本文件保持在服务端。
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
