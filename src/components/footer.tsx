'use client';

import NextLink from 'next/link';
import clsx from 'clsx';

import { siteConfig } from '@/config/site';

export const Footer = ({ className }: { className?: string }) => {
  const visibleItems = siteConfig.navItems.filter(item => !item.meta?.hidden);

  return (
    <footer
      className={clsx(
        'w-full border-t border-glass backdrop-blur-xl',
        'bg-background/60',
        className
      )}
    >
      <div className="max-w-6xl mx-auto px-6 pt-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* 左侧：品牌 */}
          <div>
            <h3 className="text-xl font-bold mb-4 text-main">
              {siteConfig.name}
            </h3>
            <p className="text-default-500 text-sm">
              探索世界各地的精彩瞬间
            </p>
          </div>

          {/* 中间：快速链接 */}
          <div>
            <h4 className="text-lg font-semibold mb-3 text-default-700">
              快速链接
            </h4>
            <ul className="space-y-2">
              {visibleItems.map(item => (
                <li key={item.href}>
                  <NextLink
                    className="text-default-500 hover:text-main transition-colors text-sm"
                    href={item.href}
                  >
                    {item.label}
                  </NextLink>
                </li>
              ))}
            </ul>
          </div>

          {/* 右侧：关于 */}
          <div>
            <h4 className="text-lg font-semibold mb-3 text-default-700">
              关于
            </h4>
            <p className="text-default-500 text-sm mb-2">
              Power by Next.js
            </p>
            <p className="text-default-400 text-xs">
              豫ICP备16008805号-1
            </p>
          </div>
        </div>

        {/* 底部版权 */}
        <div className="mt-8 pt-6 pb-2 text-center text-default-400 text-sm">
          <p>&copy; {new Date().getFullYear()} {siteConfig.name}. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};
