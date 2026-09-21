'use client';

import { ScrollShadow } from '@heroui/scroll-shadow';
import { Camera, Plus, Trash2 } from 'lucide-react';
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from 'motion/react';
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

const historyEase = [0.16, 1, 0.3, 1] as const;

/** 会话侧栏：以淡入、细指示条滑动和退出收束缓和历史列表的硬切换。 */
export function ChatSidebar({
  chatHistories,
  activeConversationId,
  onNewChat,
  onSelectChat,
  onDeleteChat
}: ChatSidebarProps) {
  const shouldReduce = useReducedMotion();
  const itemTransition = shouldReduce
    ? { duration: 0 }
    : { duration: 0.24, ease: historyEase };

  return (
    <aside className="hidden w-[272px] shrink-0 flex-col border-r border-lab-line bg-lab-raised md:flex">
      <div className="border-b border-lab-line p-5">
        <div className="mb-5 flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center border border-lab-line-strong">
            <Camera className="h-4 w-4 text-lab-muted" />
          </span>
          <span className="min-w-0">
            <span className="lab-action block truncate text-lab-paper">照片小助手</span>
            <Eyebrow className="mt-1 block">Photo Companion</Eyebrow>
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
          <Eyebrow>聊过的话题</Eyebrow>
        </div>

        <ScrollShadow className="min-h-0 flex-1 px-2 pb-2">
          {chatHistories.length === 0 ? (
            <p className="px-3 py-2 text-xs text-lab-faint">还没有聊过</p>
          ) : (
            <LayoutGroup id="agent-history-desktop">
              <AnimatePresence initial={!shouldReduce} mode="popLayout">
                {chatHistories.map((chat, index) => {
                  const isActive = chat.id === activeConversationId;

                  return (
                    <motion.div
                      key={chat.id}
                      layout="position"
                      initial={shouldReduce ? false : { opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={shouldReduce ? undefined : { opacity: 0, x: -6, height: 0 }}
                      transition={{
                        ...itemTransition,
                        delay: shouldReduce ? 0 : Math.min(index, 5) * 0.025
                      }}
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
                        'group/item relative flex cursor-pointer items-start justify-between gap-2 overflow-hidden',
                        'border px-3 py-2.5 text-left transition-colors duration-200',
                        isActive
                          ? 'border-lab-line bg-lab-sunken'
                          : 'border-transparent hover:border-lab-line hover:bg-lab-sunken',
                        'focus-visible:outline-1 focus-visible:outline-lab-accent'
                      )}
                    >
                      {isActive && (
                        <motion.span
                          layoutId="agent-history-active-desktop"
                          aria-hidden
                          className="pointer-events-none absolute inset-y-2 left-0 w-[2px] bg-lab-accent"
                          transition={itemTransition}
                        />
                      )}

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
                          'shrink-0 cursor-pointer p-1 text-lab-faint opacity-0 transition-opacity duration-200',
                          'group-hover/item:opacity-100 hover:text-lab-danger',
                          'focus-visible:opacity-100 focus-visible:outline-1 focus-visible:outline-lab-accent'
                        )}
                      >
                        <Trash2 size={13} />
                      </button>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </LayoutGroup>
          )}
        </ScrollShadow>
      </div>

      <div className="border-t border-lab-line px-5 py-4">
        <Eyebrow>Qwen · bge-m3</Eyebrow>
      </div>
    </aside>
  );
}
