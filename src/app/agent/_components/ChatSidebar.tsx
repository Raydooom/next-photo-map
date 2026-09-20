'use client';

import { ScrollShadow } from '@heroui/scroll-shadow';
import { Plus, Trash2, Camera } from 'lucide-react';
import clsx from 'clsx';
import { Eyebrow } from '@/components/ui';
import { ChatHistory } from './types';

interface ChatSidebarProps {
  chatHistories: ChatHistory[];
  onNewChat?: () => void;
  onDeleteChat?: (id: string) => void;
}

/**
 * 会话侧栏。
 *
 * 与站内其余面板同一套做法：直角、1px 描边划分层级、不用阴影与渐变。
 * 底色取 raised 比页面底 ink 抬升一档，右侧一条 line 与对话区分家。
 */
export function ChatSidebar({
  chatHistories,
  onNewChat,
  onDeleteChat
}: ChatSidebarProps) {
  return (
    <aside className="hidden w-[272px] shrink-0 flex-col border-r border-lab-line bg-lab-raised md:flex">
      <div className="border-b border-lab-line p-5">
        <div className="mb-5 flex items-center gap-3">
          {/* 标识用描边方框而非渐变圆角，与导航栏的 logo 处理一致 */}
          <span className="flex h-9 w-9 shrink-0 items-center justify-center border border-lab-line-strong">
            <Camera className="h-4 w-4 text-lab-accent" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm text-lab-paper">
              摄影助手
            </span>
            <Eyebrow className="block text-[11px]">Agent</Eyebrow>
          </span>
        </div>

        <button
          type="button"
          onClick={onNewChat}
          className={clsx(
            'group/new flex h-10 w-full items-center justify-center gap-2',
            'border border-lab-line-strong text-lab-paper',
            'transition-colors duration-300 hover:border-lab-accent hover:text-lab-accent',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lab-accent'
          )}
        >
          <Plus size={15} />
          <span className="text-[13px]">新建对话</span>
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="px-5 pb-2 pt-4">
          <Eyebrow className="text-[11px]">History</Eyebrow>
        </div>

        <ScrollShadow className="min-h-0 flex-1 px-2 pb-2">
          {chatHistories.length === 0 ? (
            <p className="px-3 py-2 text-xs text-lab-faint">暂无历史对话</p>
          ) : (
            chatHistories.map((chat) => (
              <div
                key={chat.id}
                className={clsx(
                  'group/item flex cursor-pointer items-start justify-between gap-2',
                  'border border-transparent px-3 py-2.5',
                  'transition-colors duration-200',
                  'hover:border-lab-line hover:bg-lab-sunken'
                )}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] text-lab-paper">
                    {chat.title}
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-lab-faint">
                    {chat.preview}
                  </span>
                </span>

                <button
                  type="button"
                  aria-label="删除对话"
                  onClick={() => onDeleteChat?.(chat.id)}
                  className={clsx(
                    'shrink-0 p-1 text-lab-faint opacity-0',
                    'transition-opacity duration-200',
                    'group-hover/item:opacity-100 hover:text-lab-danger',
                    'focus-visible:opacity-100 focus-visible:outline-1 focus-visible:outline-lab-accent'
                  )}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))
          )}
        </ScrollShadow>
      </div>

      <div className="border-t border-lab-line px-5 py-4">
        <Eyebrow className="text-[11px]">Qwen · bge-m3</Eyebrow>
      </div>
    </aside>
  );
}
