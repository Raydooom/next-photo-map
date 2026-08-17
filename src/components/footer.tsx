'use client';

import NextLink from 'next/link';
import clsx from 'clsx';

import { siteConfig } from '@/config/site';
import { Eyebrow } from '@/components/ui';

export const Footer = ({ className }: { className?: string }) => {
  const visibleItems = siteConfig.navItems.filter((item) => !item.meta?.hidden);

  return (
    <footer className={clsx('border-t border-lab-line bg-lab-ink', className)}>
      <div className="lab-shell py-14">
        <div className="lab-grid gap-y-10">
          {/* 品牌 */}
          <div className="col-span-full md:col-span-5">
            <p className="text-2xl uppercase tracking-[-0.02em] text-lab-paper [font-variation-settings:'wght'_680]">
              {siteConfig.name}
            </p>
            <p className="lab-body mt-3 max-w-[32ch] text-lab-muted">
              探索世界各地的精彩瞬间
            </p>
          </div>

          {/* 快速链接 */}
          <div className="col-span-full md:col-span-3 md:col-start-7">
            <Eyebrow className="block">Navigate</Eyebrow>
            <ul className="mt-5 space-y-1">
              {visibleItems.map((item) => (
                <li key={item.href}>
                  <NextLink
                    className="lab-mono flex min-h-9 items-center text-lab-muted transition-colors hover:text-lab-accent"
                    href={item.href}
                  >
                    {item.label}
                  </NextLink>
                </li>
              ))}
            </ul>
          </div>

          {/* 关于 */}
          <div className="col-span-full md:col-span-3 md:col-start-10">
            <Eyebrow className="block">About</Eyebrow>
            <p className="lab-mono mt-5 text-lab-muted">Power by Next.js</p>
            {/* 含中文，不套 lab-mono 的大写与宽字距 */}
            <p className="mt-2 text-xs text-lab-faint">豫ICP备16008805号-1</p>
          </div>
        </div>

        {/* 版权 */}
        <div className="mt-14 flex flex-wrap items-center justify-between gap-3 border-t border-lab-line pt-6">
          <span className="lab-mono text-lab-faint">
            © {new Date().getFullYear()} {siteConfig.name}
          </span>
          <span className="lab-mono text-lab-faint">All rights reserved</span>
        </div>
      </div>
    </footer>
  );
};
