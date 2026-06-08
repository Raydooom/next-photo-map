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
    <div className="h-19">
      <HeroUINavbar
        maxWidth="full"
        isMenuOpen={isMenuOpen}
        onMenuOpenChange={setIsMenuOpen}
        className={clsx(
          'fixed top-3 md:top-5 left-1/2 -translate-x-1/2 z-[50]',
          'w-[calc(100%-1.5rem)] sm:w-[calc(100%-3rem)] max-w-5xl h-14',
          'rounded-full backdrop-blur-xl border-glass shadow-2xl',
          'px-3 sm:px-5',
          className
        )}
        classNames={{
          // 移动端菜单浮层样式：从导航栏下方展开
          menu: clsx(
            'top-16 mx-3 w-[calc(100%-1.5rem)] max-w-5xl',
            'rounded-2xl border-glass backdrop-blur-xl shadow-2xl',
            'pt-4 gap-1 bg-background/80'
          )
        }}
      >
        {/* 左侧：品牌 */}
        <NavbarBrand className="gap-2">
          <NextLink
            className="flex justify-start items-center gap-2 hover:opacity-80 transition-opacity"
            href="/"
          >
            <Logo className="w-7 h-7 sm:w-8 sm:h-8" />
            <p className="font-bold tracking-tight text-base sm:text-lg uppercase">
              RAY·DOM
            </p>
          </NextLink>
        </NavbarBrand>

        {/* 中间：桌面端导航（移动端隐藏） */}
        <NavbarContent
          className="hidden sm:flex gap-1 sm:gap-2"
          justify="center"
        >
          {visibleItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <NavbarItem key={item.href}>
                <NextLink
                  className={clsx(
                    'flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-full text-sm transition-all duration-200',
                    isActive
                      ? 'bg-background/80 text-main font-medium'
                      : 'text-default-500 hover:text-main hover:bg-background/5'
                  )}
                  href={item.href}
                >
                  {item.meta?.icon && (
                    <item.meta.icon
                      className={clsx(
                        'w-3.5 h-3.5 shrink-0',
                        isActive ? 'text-main' : 'text-default-500'
                      )}
                    />
                  )}
                  <span>{item.label}</span>
                </NextLink>
              </NavbarItem>
            );
          })}
        </NavbarContent>

        {/* 右侧：主题切换 + 移动端汉堡按钮 */}
        <NavbarContent className="gap-2 sm:gap-4" justify="end">
          <ThemeSwitch className="scale-85" />
          <NavbarMenuToggle
            className="sm:hidden w-8 h-8"
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
                  className={clsx(
                    'flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-base transition-colors',
                    isActive
                      ? 'bg-primary/10 text-main font-medium'
                      : 'text-default-500 hover:text-main hover:bg-background/40'
                  )}
                  href={item.href}
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.meta?.icon && (
                    <item.meta.icon
                      className={clsx(
                        'w-4 h-4 shrink-0',
                        isActive ? 'text-primary' : 'text-default-500'
                      )}
                    />
                  )}
                  <span>{item.label}</span>
                </NextLink>
              </NavbarMenuItem>
            );
          })}
        </NavbarMenu>
      </HeroUINavbar>
    </div>
  );
};
