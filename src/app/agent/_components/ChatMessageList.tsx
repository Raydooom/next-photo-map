'use client';

import { ScrollShadow } from '@heroui/scroll-shadow';
import { RefObject, useEffect } from 'react';
import { Message } from './types';
import { ChatMessage } from './ChatMessage';
import { WelcomeScreen } from './WelcomeScreen';

interface ChatMessageListProps {
  messages: Message[];
  scrollRef: RefObject<HTMLDivElement>;
  onSuggestionClick?: (suggestion: string) => void;
}

export function ChatMessageList({
  messages,
  scrollRef,
  onSuggestionClick
}: ChatMessageListProps) {
  useEffect(() => {
    // 等本轮 token 对应的 DOM 落下后再滚动；逐 token 用 auto，避免 smooth 动画堆积抖动。
    const frame = requestAnimationFrame(() => {
      const container = scrollRef.current;
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    });

    return () => cancelAnimationFrame(frame);
  }, [messages, scrollRef]);

  return (
    <ScrollShadow ref={scrollRef} className="min-h-0 flex-1 px-4 py-8 md:px-8">
      {/* 消息之间靠留白分隔，不再有边框划界，故间距要给足 */}
      <div className="mx-auto max-w-3xl space-y-8">
        {messages.length === 0 ? (
          <WelcomeScreen onSuggestionClick={onSuggestionClick} />
        ) : (
          messages.map((msg) => <ChatMessage key={msg.chatId} message={msg} />)
        )}
      </div>
    </ScrollShadow>
  );
}
