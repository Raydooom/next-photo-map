'use client';
import { Tabs, Tab } from '@heroui/tabs';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function AdminLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const getSelectedKey = () => {
    if (pathname.includes('/photos')) return 'photos';
    if (pathname.includes('/scan')) return 'scan';
    return 'overview';
  };

  return (
    <div className="p-2 max-w-7xl mx-auto">
      <Tabs
        aria-label="Admin modules"
        selectedKey={getSelectedKey()}
        className="mb-4"
      >
        <Tab
          key="overview"
          title={
            <Link href="/admin" className="flex items-center gap-2">
              概览
            </Link>
          }
        />
        <Tab
          key="photos"
          title={
            <Link href="/admin/photos" className="flex items-center gap-2">
              图片管理
            </Link>
          }
        />
        <Tab
          key="scan"
          title={
            <Link href="/admin/scan" className="flex items-center gap-2">
              图片扫描
            </Link>
          }
        />
      </Tabs>
      <div>{children}</div>
    </div>
  );
}
