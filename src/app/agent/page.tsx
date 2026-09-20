'use client';

import { useRef, useState } from 'react';
import {
  ChatSidebar,
  ChatHeader,
  ChatInput,
  ChatMessageList,
  ChatHistory
} from './_components';
import { useChat } from './_hooks';

// Mock 数据，实际应从 API 获取
const MOCK_CHAT_HISTORIES: ChatHistory[] = [
];

export default function ChatPage() {
  const [inputValue, setInputValue] = useState('');
  const [chatHistories] = useState<ChatHistory[]>(MOCK_CHAT_HISTORIES);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { messages, isTyping, sendMessage, clearMessages } = useChat({
    onError: (error) => console.error('发送消息失败:', error)
  });

  const handleSend = () => {
    if (!inputValue.trim() || isTyping) return;
    sendMessage(inputValue);
    setInputValue('');
  };

  const handleNewChat = () => {
    clearMessages();
    setInputValue('');
  };

  const handleDeleteChat = (id: string) => {
    console.log('删除对话:', id);
    // TODO: 调用删除 API
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion);
    inputRef.current?.focus();
  };

  return (
    // dvh 而非 vh：移动端 100vh 含地址栏高度，会让页面多出一截可滚动区域
    <div className="flex h-[100dvh] w-full overflow-hidden bg-lab-ink">
      <ChatSidebar
        chatHistories={chatHistories}
        onNewChat={handleNewChat}
        onDeleteChat={handleDeleteChat}
      />

      <main className="flex min-w-0 flex-1 flex-col">
        <ChatHeader />

        <ChatMessageList
          messages={messages}
          scrollRef={scrollRef}
          onSuggestionClick={handleSuggestionClick}
        />

        <ChatInput
          value={inputValue}
          onChange={setInputValue}
          onSend={handleSend}
          isTyping={isTyping}
          inputRef={inputRef}
        />
      </main>
    </div>
  );
}
