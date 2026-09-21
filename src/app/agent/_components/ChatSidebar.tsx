'use client';

import { ScrollShadow } from '@heroui/scroll-shadow';
import { Plus, Trash2, Camera } from 'lucide-react';
import clsx from 'clsx';
import { Eyebrow, LabButton } from '@/components/ui';
import { ChatHistory } from './types';

interface ChatSidebarProps {
  chatHistories: ChatHistory[];
  activeConversationId: string | null;
  onNewChat?: () => void;
  onSelectChat?: (id: string) => void;
  onDeleteChat?: (id: string) => void;
}

/** 会话侧栏：历史列表只展示应用层持久化记录，不读取 Agent checkpoint。 */
export function ChatSidebar({
  chatHistories,
  activeConversationId,
  onNewChat,
  onSelectChat,
  onDeleteChat
}: ChatSidebarProps) {
  return (
    <aside className="hidden w-[272px] shrink-0 flex-col border-r border-lab-line bg-lab-raised md:flex">
      <div className="border-b border-lab-line p-5">
        <div className="mb-5 flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center border border-lab-line-strong">
            <Camera className="h-4 w-4 text-lab-muted" />
          </span>
          <span className="min-w-0">
            <span className="lab-action block truncate text-lab-paper">智能助手</span>
            <Eyebrow className="mt-1 block">Agent</Eyebrow>
          </span>
        </div>

        <LabButton variant="primary" className="w-full" onClick={onNewChat}>
          <span className="inline-flex items-center gap-2">
            <Plus size={15} />
            新建对话
          </span>
        </LabButton>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="px-5 pb-2 pt-4">
          <Eyebrow>历史对话</Eyebrow>
        </div>

        <ScrollShadow className="min-h-0 flex-1 px-2 pb-2">
          {chatHistories.length === 0 ? (
            <p className="px-3 py-2 text-xs text-lab-faint">暂无历史对话</p>
          ) : (
            chatHistories.map((chat) => {
              const isActive = chat.id === activeConversationId;

              return (
                <div
                  key={chat.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelectChat?.(chat.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      onSelectChat?.(chat.id);
                    }
                  }}
                  className={clsx(
                    'group/item flex cursor-pointer items-start justify-between gap-2',
                    'border px-3 py-2.5 text-left transition-colors duration-200',
                    isActive
                      ? 'border-lab-line bg-lab-sunken'
                      : 'border-transparent hover:border-lab-line hover:bg-lab-sunken',
                    'focus-visible:outline-1 focus-visible:outline-lab-accent'
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
                    onClick={(event) => {
                      event.stopPropagation();
                      onDeleteChat?.(chat.id);
                    }}
                    className={clsx(
                      'shrink-0 p-1 text-lab-faint opacity-0 transition-opacity duration-200',
                      'group-hover/item:opacity-100 hover:text-lab-danger',
                      'focus-visible:opacity-100 focus-visible:outline-1 focus-visible:outline-lab-accent'
                    )}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              );
            })
          )}
        </ScrollShadow>
      </div>

      <div className="border-t border-lab-line px-5 py-4">
        <Eyebrow>Qwen · bge-m3</Eyebrow>
      </div>
    </aside>
  );
}
