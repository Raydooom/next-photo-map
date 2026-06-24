'use client';

import { MessageSquare } from 'lucide-react';
import { ThemeSwitch } from '@/components/theme-switch';

interface ChatHeaderProps {
  title?: string;
  subtitle?: string;
}

export function ChatHeader({
  title = 'AI 对话',
  subtitle = '智能照片搜索与分析'
}: ChatHeaderProps) {
  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-divider bg-content1/30 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-secondary/20 flex items-center justify-center">
          <MessageSquare size={16} className="text-secondary" />
        </div>
        <div>
          <h2 className="font-semibold text-default-700">{title}</h2>
          <p className="text-xs text-default-400">{subtitle}</p>
        </div>
      </div>
      <ThemeSwitch className="scale-85" />
    </header>
  );
}
