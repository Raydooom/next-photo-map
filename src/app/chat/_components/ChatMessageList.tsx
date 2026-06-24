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
    <ScrollShadow ref={scrollRef} className="flex-1 px-4 md:px-8 py-6">
      <div className="max-w-3xl mx-auto space-y-4">
        {messages.length === 0 ? (
          <WelcomeScreen onSuggestionClick={onSuggestionClick} />
        ) : (
          messages.map((msg) => <ChatMessage key={msg.chatId} message={msg} />)
        )}
      </div>
    </ScrollShadow>
  );
}
