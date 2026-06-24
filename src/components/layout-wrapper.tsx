'use client';

import { usePathname } from 'next/navigation';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { ReactNode } from 'react';
import { siteConfig } from '@/config/site';

interface LayoutWrapperProps {
  children: ReactNode;
}

export function LayoutWrapper({ children }: LayoutWrapperProps) {
  const pathname = usePathname();

  // 获取当前路由配置
  const currentRoute = siteConfig.navItems.find(item => pathname === item.href);
  const isShowTopBar = currentRoute?.meta?.showTopBar;
  const isShowFooter = currentRoute?.meta?.showFooter;

  return (
    <div className="min-h-screen flex flex-col">
      {isShowTopBar && <Navbar />}
      <main className="flex-1">{children}</main>
      {isShowFooter && <Footer />}
    </div>
  );
}
