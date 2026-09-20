'use client';

import { ScrollShadow } from '@heroui/scroll-shadow';
import { RefObject } from 'react';
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
  return (
    <ScrollShadow ref={scrollRef} className="min-h-0 flex-1 px-4 py-6 md:px-8">
      <div className="mx-auto max-w-3xl space-y-5">
        {messages.length === 0 ? (
          <WelcomeScreen onSuggestionClick={onSuggestionClick} />
        ) : (
          messages.map((msg) => <ChatMessage key={msg.chatId} message={msg} />)
        )}
      </div>
    </ScrollShadow>
  );
}
