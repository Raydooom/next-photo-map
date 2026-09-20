'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { ThemeSwitch } from '@/components/layout/ThemeSwitch';
import { Eyebrow } from '@/components/ui';

interface ChatHeaderProps {
  title?: string;
  subtitle?: string;
}

/**
 * 对话区顶栏。
 *
 * 本页是全屏布局、不挂站点导航栏，故左侧补一个返回入口 ——
 * 否则进来之后没有站内出口。
 */
export function ChatHeader({
  title = '摄影助手',
  subtitle = '照片检索与影像分析'
}: ChatHeaderProps) {
  return (
    <header className="flex shrink-0 items-center justify-between gap-4 border-b border-lab-line px-5 py-3.5">
      <div className="flex min-w-0 items-center gap-4">
        <Link
          href="/"
          aria-label="返回首页"
          className="shrink-0 p-1 text-lab-muted transition-colors duration-300 hover:text-lab-accent focus-visible:outline-1 focus-visible:outline-lab-accent"
        >
          <ArrowLeft size={16} />
        </Link>

        <span className="h-8 w-px shrink-0 bg-lab-line" aria-hidden />

        <span className="min-w-0">
          <span className="block truncate text-sm text-lab-paper">{title}</span>
          <Eyebrow className="block text-[11px]">{subtitle}</Eyebrow>
        </span>
      </div>

      <ThemeSwitch />
    </header>
  );
}
