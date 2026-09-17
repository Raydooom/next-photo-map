import { LayoutPanelTop, MapPinned, Home } from 'lucide-react';

export type SiteConfig = typeof siteConfig;

export const siteConfig = {
  name: 'RAY·DOM',
  address: 'raydom.wang',
  description:
    '光影空间，旅行游记，摄影作品分享，随笔随想，一起探索世界，一起发现更大的世界。这里是您探索各地之美、感受旅行乐趣与摄影艺术的独特空间。',
  // 仅描述导航栏里列哪些入口。
  // 页面是否带导航栏/页脚由路由组的 layout 决定，不再靠这里的 meta 标记 ——
  // 那样会让导航配置兼管布局，且路径全等比较对动态子路由不成立。
  navItems: [
    {
      label: 'Home',
      href: '/',
      meta: { icon: Home }
    },
    {
      label: 'Photos',
      href: '/photos',
      meta: { icon: LayoutPanelTop }
    },
    {
      label: 'Footprints',
      href: '/footprint',
      meta: { icon: MapPinned }
    },
    {
      label: 'AIChat',
      href: '/chat',
      meta: { icon: MapPinned, hidden: true }
    },
    {
      label: 'Admin',
      href: '/admin',
      meta: { icon: MapPinned, hidden: true }
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
