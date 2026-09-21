'use client';

import { ScrollShadow } from '@heroui/scroll-shadow';
import { RefObject, useEffect, useRef } from 'react';
import { Message } from './types';
import { ChatMessage } from './ChatMessage';
import { WelcomeScreen } from './WelcomeScreen';

interface ChatMessageListProps {
  messages: Message[];
  isLoading?: boolean;
  scrollRef: RefObject<HTMLDivElement>;
  onSuggestionClick?: (suggestion: string) => void;
}

function ConversationLoading() {
  return (
    <div className="flex min-h-48 items-center">
      <div className="flex items-center gap-2.5 text-lab-muted">
        <span
          aria-hidden
          className="h-3 w-3 animate-spin border border-lab-muted border-t-transparent"
        />
        <span className="lab-action">正在载入对话</span>
      </div>
    </div>
  );
}

export function ChatMessageList({
  messages,
  isLoading = false,
  scrollRef,
  onSuggestionClick
}: ChatMessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ block: 'end', behavior: 'auto' });
    });

    return () => cancelAnimationFrame(frame);
  }, [messages, isLoading]);

  return (
    <ScrollShadow ref={scrollRef} className="min-h-0 flex-1 px-4 py-8 md:px-8">
      <div className="mx-auto max-w-3xl space-y-8">
        {isLoading ? (
          <ConversationLoading />
        ) : messages.length === 0 ? (
          <WelcomeScreen onSuggestionClick={onSuggestionClick} />
        ) : (
          messages.map((msg) => <ChatMessage key={msg.id} message={msg} />)
        )}
        <div ref={bottomRef} aria-hidden className="h-px" />
      </div>
    </ScrollShadow>
  );
}
