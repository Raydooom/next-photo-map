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
  {
    id: '1',
    title: '故宫附近的雪景照片',
    createdAt: new Date(),
    preview: '找到了5张照片...'
  },
  {
    id: '2',
    title: '夕阳下的建筑构图',
    createdAt: new Date(Date.now() - 86400000),
    preview: '分析光影效果...'
  },
  {
    id: '3',
    title: '春季樱花拍摄技巧',
    createdAt: new Date(Date.now() - 172800000),
    preview: '推荐拍摄角度...'
  }
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
    <div className="flex h-screen w-full bg-background overflow-hidden">
      <ChatSidebar
        chatHistories={chatHistories}
        onNewChat={handleNewChat}
        onDeleteChat={handleDeleteChat}
      />

      <main className="flex flex-col flex-1 relative bg-background">
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
