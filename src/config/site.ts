import { LayoutPanelTop, MapPinned, Home, Sparkles } from 'lucide-react';

export type SiteConfig = typeof siteConfig;

export const siteConfig = {
  name: 'RAY·DOM',
  address: 'raydom.wang',
  description:
    '光影空间，旅行游记，摄影作品分享，随笔随想，一起探索世界，一起发现更大的世界。这里是您探索各地之美、感受旅行乐趣与摄影艺术的独特空间。',
  // 仅描述导航栏列哪些入口；页面是否带导航栏/页脚由路由组的 layout 决定
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
      // 图标不跟 Footprints 共用 MapPinned：导航里两项同图标，图标就不再是区分手段
      label: 'Agent',
      href: '/agent',
      meta: { icon: Sparkles }
    },
    {
      label: 'Admin',
      href: '/admin',
      meta: { icon: MapPinned, hidden: true }
    }
  ],
  links: {
    github: 'https://github.com/Raydooom/next-photo-map'
  }
};
