'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

/**
 * 路由切换后把页面滚回顶部。
 *
 * 从原 LayoutWrapper 里拆出来单独成件：布局归属已由路由组表达，
 * 这里只剩下这一个真正需要客户端运行时的副作用。
 * 拆开后 layout 本身可以保持为 Server Component。
 */
export function ScrollReset() {
  const pathname = usePathname();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
