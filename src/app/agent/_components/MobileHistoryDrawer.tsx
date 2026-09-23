'use client';

import { ScrollShadow } from '@heroui/scroll-shadow';
import { Plus, Sparkles, Trash2, X } from 'lucide-react';
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from 'motion/react';
import { useEffect } from 'react';
import clsx from 'clsx';
import { Eyebrow, LabButton } from '@/components/ui';
import { ChatHistory } from './types';

interface MobileHistoryDrawerProps {
  isOpen: boolean;
  chatHistories: ChatHistory[];
  activeConversationId: string | null;
  onClose: () => void;
  onNewChat: () => void;
  onSelectChat: (id: string) => void;
  onDeleteChat: (id: string) => void;
}

const historyEase = [0.16, 1, 0.3, 1] as const;

/** 移动端会话入口：遮罩淡入、面板左滑，避免历史面板硬切到对话之上。 */
export function MobileHistoryDrawer({
  isOpen,
  chatHistories,
  activeConversationId,
  onClose,
  onNewChat,
  onSelectChat,
  onDeleteChat
}: MobileHistoryDrawerProps) {
  const shouldReduce = useReducedMotion();
  const transition = shouldReduce
    ? { duration: 0 }
    : { duration: 0.28, ease: historyEase };

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="历史对话"
          className="fixed inset-0 z-50 md:hidden"
          initial={shouldReduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={transition}
        >
          <motion.button
            type="button"
            aria-label="关闭历史对话"
            onClick={onClose}
            className="absolute inset-0 cursor-pointer bg-black/60"
            initial={shouldReduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={transition}
          />

          <motion.aside
            className="relative flex h-full w-[min(84vw,320px)] flex-col border-r border-lab-line bg-lab-raised"
            initial={shouldReduce ? false : { x: -24 }}
            animate={{ x: 0 }}
            exit={{ x: -24 }}
            transition={transition}
          >
            <div className="border-b border-lab-line p-5">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center border border-lab-line-strong">
                    <Sparkles className="h-4 w-4 text-lab-accent" />
                  </span>
                  <span className="min-w-0">
                    <span className="lab-action block truncate text-lab-paper">照片小助手</span>
                    <Eyebrow className="mt-1 block">Photo Companion</Eyebrow>
                  </span>
                </div>

                <button
                  type="button"
                  aria-label="关闭历史对话"
                  onClick={onClose}
                  className="cursor-pointer p-1 text-lab-muted transition-colors hover:text-lab-paper focus-visible:outline-1 focus-visible:outline-lab-accent"
                >
                  <X size={17} />
                </button>
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
                  <LayoutGroup id="agent-history-mobile">
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
                              ...transition,
                              delay: shouldReduce ? 0 : Math.min(index, 5) * 0.025
                            }}
                            role="button"
                            tabIndex={0}
                            onClick={() => onSelectChat(chat.id)}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault();
                                onSelectChat(chat.id);
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
                                layoutId="agent-history-active-mobile"
                                aria-hidden
                                className="pointer-events-none absolute inset-y-2 left-0 w-[2px] bg-lab-accent"
                                transition={transition}
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
                                onDeleteChat(chat.id);
                              }}
                              className="shrink-0 cursor-pointer p-1 text-lab-faint opacity-100 transition-colors hover:text-lab-danger focus-visible:outline-1 focus-visible:outline-lab-accent"
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
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
