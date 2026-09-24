'use client';

import NextLink from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, History } from 'lucide-react';
import { SiGithub } from 'react-icons/si';
import { siteConfig } from '@/config/site';
import { ThemeSwitch } from '@/components/layout/ThemeSwitch';

interface ChatHeaderProps {
  title?: string;
  subtitle?: string;
  onOpenHistory?: () => void;
}

/**
 * 对话区顶栏。
 *
 * 本页是全屏布局、不挂站点导航栏，故左侧补一个返回入口；
 * 移动端侧栏隐藏时，在右侧提供历史会话抽屉入口。
 */
export function ChatHeader({
  title = '照片小助手',
  subtitle = '帮你找回拍下的瞬间',
  onOpenHistory
}: ChatHeaderProps) {
  const router = useRouter();

  /**
   * 退回上一页。
   *
   * history 只有当前这一条时（外部链接直接打开本页、或新标签页打开），
   * back() 会把人带出站点，此时退到首页更合适。
   */
  const goBack = () => {
    if (window.history.length > 1) {
      router.back();
      return;
    }
    router.push('/');
  };

  return (
    <header className="flex shrink-0 items-center justify-between gap-4 border-b border-lab-line px-5 py-3.5">
      <div className="flex min-w-0 items-center gap-4">
        <button
          type="button"
          aria-label="返回上一页"
          onClick={goBack}
          className="shrink-0 cursor-pointer p-1 text-lab-muted transition-colors duration-300 hover:text-lab-paper focus-visible:outline-1 focus-visible:outline-lab-accent"
        >
          <ArrowLeft size={16} />
        </button>

        <span className="h-8 w-px shrink-0 bg-lab-line" aria-hidden />

        <span className="min-w-0">
          <span className="lab-action block truncate text-lab-paper">{title}</span>
          <span className="mt-1 block truncate text-xs text-lab-muted">
            {subtitle}
          </span>
        </span>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <button
          type="button"
          aria-label="打开历史对话"
          onClick={onOpenHistory}
          className="cursor-pointer p-1 text-lab-muted transition-colors hover:text-lab-paper focus-visible:outline-1 focus-visible:outline-lab-accent md:hidden"
        >
          <History size={17} />
        </button>

        <NextLink
          href={siteConfig.links.github}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="在 GitHub 查看源码"
          className="p-1 text-lab-muted transition-colors duration-200 hover:text-lab-paper focus-visible:outline-1 focus-visible:outline-lab-accent"
        >
          <SiGithub className="h-[17px] w-[17px]" />
        </NextLink>

        <ThemeSwitch />
      </div>
    </header>
  );
}
