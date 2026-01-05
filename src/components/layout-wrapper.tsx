'use client';

import { usePathname } from 'next/navigation';
import { Navbar } from '@/components/navbar';
import { ReactNode } from 'react';
import { siteConfig } from '@/config/site';

interface LayoutWrapperProps {
  children: ReactNode;
}

export function LayoutWrapper({ children }: LayoutWrapperProps) {
  const pathname = usePathname();

  // 获取当前路由配置
  const currentRoute = siteConfig.navItems.find(item => pathname === item.href);
  const isFullscreen = currentRoute?.meta?.fullscreen;

  return (
    <div className="relative flex flex-col min-h-screen">
      {!isFullscreen && <Navbar />}
      <main>{children}</main>
      {!isFullscreen && (
        <footer className="w-full flex items-center justify-center py-3">
          <a
            className="flex items-center gap-1 text-current"
            href="https://heroui.com?utm_source=next-app-template"
            title="heroui.com homepage"
          >
            <span className="text-default-600">Powered by</span>
            <p className="text-primary">HeroUI</p>
          </a>
        </footer>
      )}
    </div>
  );
}
