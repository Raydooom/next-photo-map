'use client';

import {
  Navbar as HeroUINavbar,
  NavbarContent,
  NavbarBrand,
  NavbarItem,
  NavbarMenu,
  NavbarMenuItem,
  NavbarMenuToggle
} from '@heroui/navbar';
import NextLink from 'next/link';
import clsx from 'clsx';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

import { siteConfig } from '@/config/site';
import { ThemeSwitch } from '@/components/theme-switch';
import { Logo } from '@/components/Icons/custom';

export const Navbar = ({ className }: { className?: string }) => {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const visibleItems = siteConfig.navItems.filter((item) => !item.meta?.hidden);

  return (
    <HeroUINavbar
      isBordered={false}
      maxWidth="full"
      height="60px"
      position="sticky"
      isMenuOpen={isMenuOpen}
      onMenuOpenChange={setIsMenuOpen}
      className={clsx(
        // 贴顶通栏：直角、仅靠 1px 底边与内容分隔
        'border-b border-lab-line',
        // 背景交由 .nav-veil 的两层伪元素承担，故自身透明；
        // 同时关掉 HeroUI 自带的模糊，避免与遮罩层叠加
        'nav-veil bg-black/30',
        'backdrop-blur-xs',
        className
      )}
      classNames={{
        // z-10 使导航内容压在 .nav-veil 的两层遮罩之上
        wrapper:
          'relative z-10 max-w-[var(--lab-max-w)] px-[var(--lab-gutter)]!',
        // 移动端菜单浮层：同样去圆角，贴在导航条下方
        menu: clsx(
          'top-[60px] border-b border-lab-line bg-lab-ink',
          'px-[var(--lab-gutter)]! pt-4 gap-1'
        )
      }}
    >
      {/* 左侧：品牌 */}
      <NavbarBrand>
        <NextLink
          className="flex items-center gap-2.5 transition-opacity hover:opacity-75"
          href="/"
        >
          {/* 尺寸与 Logo 的 32px 原始输出一致，避免缩放导致的发虚 */}
          <Logo className="h-8 w-8 shrink-0" />

          {/* 两行独立设样式：中英文的字距与字重需求相反，不能靠继承 */}
          <span className="flex flex-col">
            <span
              className={clsx(
                'text-[15px] uppercase leading-none text-lab-paper',
                "tracking-[0.07em] [font-variation-settings:'wght'_680]"
              )}
            >
              {/* 分隔点两侧保留视觉间隙，故不直接取 siteConfig.name */}
              RAY&nbsp;·&nbsp;DOM
            </span>
            <span
              className={clsx(
                'mt-[7px] text-xs leading-none text-lab-muted',
                // 中文靠正字距舒展，字重回到常规
                "tracking-[0.2em] [font-variation-settings:'wght'_400]"
              )}
            >
              光线领域
            </span>
          </span>
        </NextLink>
      </NavbarBrand>

      {/* 中间：桌面端导航 */}
      <NavbarContent className="hidden h-full gap-0 sm:flex" justify="center">
        {visibleItems.map((item) => {
          const isActive = pathname === item.href;

          return (
            <NavbarItem key={item.href} className="h-full">
              <NextLink
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={clsx(
                  'lab-mono relative flex h-full items-center gap-1.5 px-4',
                  'transition-colors duration-200',
                  isActive
                    ? 'text-lab-accent'
                    : 'text-lab-muted hover:text-lab-paper'
                )}
              >
                {item.meta?.icon && (
                  <item.meta.icon className="h-3.5 w-3.5 shrink-0" />
                )}
                <span>{item.label}</span>
                {/* 选中指示条 */}
                {isActive && (
                  <span
                    aria-hidden
                    className="absolute inset-x-0 bottom-0 h-[2px] bg-lab-accent"
                  />
                )}
              </NextLink>
            </NavbarItem>
          );
        })}
      </NavbarContent>

      {/* 右侧：主题切换 + 移动端汉堡按钮 */}
      <NavbarContent className="gap-2 sm:gap-4" justify="end">
        <ThemeSwitch className="scale-85" />
        <NavbarMenuToggle
          className="h-11 w-11 text-lab-muted sm:hidden"
          aria-label={isMenuOpen ? '关闭菜单' : '打开菜单'}
        />
      </NavbarContent>

      {/* 移动端下拉菜单 */}
      <NavbarMenu>
        {visibleItems.map((item) => {
          const isActive = pathname === item.href;

          return (
            <NavbarMenuItem key={item.href} isActive={isActive}>
              <NextLink
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={clsx(
                  'lab-mono flex min-h-11 w-full items-center gap-2.5 px-1 py-3',
                  'border-b border-lab-line transition-colors',
                  isActive
                    ? 'text-lab-accent'
                    : 'text-lab-muted hover:text-lab-paper'
                )}
                onClick={() => setIsMenuOpen(false)}
              >
                {item.meta?.icon && (
                  <item.meta.icon className="h-4 w-4 shrink-0" />
                )}
                <span>{item.label}</span>
              </NextLink>
            </NavbarMenuItem>
          );
        })}
      </NavbarMenu>
    </HeroUINavbar>
  );
};
