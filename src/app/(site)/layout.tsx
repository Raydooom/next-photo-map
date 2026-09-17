import { Navbar } from '@/components/layout/Navbar';
import { ScrollReset } from '@/components/layout/ScrollReset';

/**
 * 带导航栏的公开页面布局。/chat 自带 ChatHeader，用根 layout，不在这组。
 *
 * min-h-screen 不能去掉：footprint 页针对 100vh 与 100dvh 的差异做了滚动锁。
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
