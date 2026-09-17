import { Navbar } from '@/components/layout/Navbar';
import { ScrollReset } from '@/components/layout/ScrollReset';

/**
 * 带导航栏的公开页面布局。
 * 直接用根 layout 即可，不需要导航栏。
 *
 * min-h-screen + flex flex-col 与原 LayoutWrapper 保持一致 ——
 * footprint 页针对 100vh 与 100dvh 的差异做了滚动锁，依赖这个结构。
 */
export default function SiteLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <ScrollReset />
      <Navbar />
      <main className="flex-1">{children}</main>
    </div>
  );
}
