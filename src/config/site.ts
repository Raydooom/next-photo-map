import { LayoutPanelTop, MapPinned } from 'lucide-react';

export type SiteConfig = typeof siteConfig;

export const siteConfig = {
  name: 'RAY·DOM',
  description:
    '旅行游记，摄影作品分享，随笔随想，一起探索世界，一起发现更大的世界。这里是您探索各地之美、感受旅行乐趣与摄影艺术的独特空间。',
  navItems: [
    {
      label: 'Home',
      href: '/'
    },
    {
      label: 'Photos',
      href: '/photos',
      icon: LayoutPanelTop
    },
    {
      label: 'Map',
      href: '/footprint',
      icon: MapPinned
    },
    {
      label: 'Blog',
      href: '/blog'
    },
    {
      label: 'About',
      href: '/about'
    }
  ],
  links: {
    github: 'https://github.com/heroui-inc/heroui',
    twitter: 'https://twitter.com/hero_ui',
    docs: 'https://heroui.com',
    discord: 'https://discord.gg/9b6yyZKmH4',
    sponsor: 'https://patreon.com/jrgarciadev'
  }
};
