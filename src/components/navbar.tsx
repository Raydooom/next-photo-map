import {
  Navbar as HeroUINavbar,
  NavbarContent,
  NavbarBrand,
  NavbarItem
} from '@heroui/navbar';
import { Link } from '@heroui/link';
import NextLink from 'next/link';
import clsx from 'clsx';
import { usePathname } from 'next/navigation';

import { siteConfig } from '@/config/site';
import { ThemeSwitch } from '@/components/theme-switch';
import { GithubIcon } from '@/components/Icons/icon';
import { Logo } from '@/components/Icons/custom';

export const Navbar = ({ className }: { className?: string }) => {
  const pathname = usePathname();

  return (
    <div className="h-19 mb-5">
      <HeroUINavbar
        className={clsx(
          'fixed top-5 left-1/2 -translate-x-1/2 z-[50] w-6xl h-14 rounded-full backdrop-blur-xl border-glass shadow-2xl',
          className
        )}
      >
        <NavbarBrand className="gap-2">
          <NextLink
            className="flex justify-start items-center gap-2 hover:opacity-80 transition-opacity"
            href="/"
          >
            <Logo className="w-8 h-8" />
            <p className="font-bold tracking-tight text-lg uppercase">
              RAY·DOM
            </p>
          </NextLink>
        </NavbarBrand>
        <NavbarContent className="gap-2" justify="center">
          {siteConfig.navItems.map(item => {
            const isActive = pathname === item.href;
            return (
              <NavbarItem key={item.href}>
                <NextLink
                  className={clsx(
                    'flex items-center gap-1.5 px-4 py-2 rounded-full text-sm transition-all duration-200',
                    isActive
                      ? 'bg-background/80 text-main font-medium'
                      : 'text-default-500 hover:text-main hover:bg-background/5'
                  )}
                  href={item.href}
                >
                  {item.meta?.icon && (
                    <item.meta.icon
                      className={clsx(
                        'w-3.5 h-3.5',
                        isActive ? 'text-main' : 'text-default-500'
                      )}
                    />
                  )}
                  {item.label}
                </NextLink>
              </NavbarItem>
            );
          })}
        </NavbarContent>

        <NavbarContent className="gap-4" justify="end">
          <Link
            isExternal
            aria-label="Github"
            href={siteConfig.links.github}
            className="text-default-400 hover:text-main transition-colors"
          >
            <GithubIcon className="w-5 h-5" />
          </Link>
          <ThemeSwitch className="scale-85" />
        </NavbarContent>
      </HeroUINavbar>
    </div>
  );
};
