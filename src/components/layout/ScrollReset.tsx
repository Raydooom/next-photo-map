'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

/** 路由切换后滚回顶部。单独成件，好让引用它的 layout 保持在服务端。 */
export function ScrollReset() {
  const pathname = usePathname();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
