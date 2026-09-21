'use client';

import { ScrollShadow } from '@heroui/scroll-shadow';
import { RefObject, useEffect, useRef } from 'react';
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
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // ScrollShadow 可能在 ref 外再包一层可滚动节点；滚动末尾锚点能让浏览器
    // 自动找到实际滚动祖先。逐 token 使用 auto，避免 smooth 动画积压抖动。
    const frame = requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ block: 'end', behavior: 'auto' });
    });

    return () => cancelAnimationFrame(frame);
  }, [messages]);

  return (
    <ScrollShadow ref={scrollRef} className="min-h-0 flex-1 px-4 py-8 md:px-8">
      <div className="mx-auto max-w-3xl space-y-8">
        {messages.length === 0 ? (
          <WelcomeScreen onSuggestionClick={onSuggestionClick} />
        ) : (
          messages.map((msg) => <ChatMessage key={msg.id} message={msg} />)
        )}
        <div ref={bottomRef} aria-hidden className="h-px" />
      </div>
    </ScrollShadow>
  );
}
