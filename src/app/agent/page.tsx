'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  AgentConversationDetail,
  AgentConversationSummary
} from '@/lib/contracts/agent-conversation';
import {
  ChatSidebar,
  ChatHeader,
  ChatInput,
  ChatMessageList,
  ChatHistory
} from './_components';
import { useChat } from './_hooks';

type UrlHistoryMode = 'push' | 'replace' | false;

function toChatHistory(conversation: AgentConversationSummary): ChatHistory {
  return {
    id: conversation.id,
    title: conversation.title,
    preview: conversation.preview,
    createdAt: new Date(conversation.createdAt),
    updatedAt: new Date(conversation.updatedAt)
  };
}

function getConversationIdFromUrl() {
  return new URLSearchParams(window.location.search).get('conversation');
}

export default function ChatPage() {
  const [inputValue, setInputValue] = useState('');
  const [chatHistories, setChatHistories] = useState<ChatHistory[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(
    null
  );
  const [historyReady, setHistoryReady] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const historyRequestRef = useRef(0);
  const initializedRef = useRef(false);

  const syncConversationUrl = useCallback(
    (conversationId: string | null, mode: Exclude<UrlHistoryMode, false>) => {
      const url = new URL(window.location.href);
      if (conversationId) {
        url.searchParams.set('conversation', conversationId);
      } else {
        url.searchParams.delete('conversation');
      }

      const nextUrl = `${url.pathname}${url.search}${url.hash}`;
      const updateHistory =
        mode === 'push' ? window.history.pushState : window.history.replaceState;
      updateHistory.call(window.history, window.history.state, '', nextUrl);
    },
    []
  );

  const loadHistories = useCallback(async () => {
    try {
      const response = await fetch('/api/agent/conversations');
      if (!response.ok) throw new Error('无法读取会话列表');

      const data = (await response.json()) as {
        conversations: AgentConversationSummary[];
      };
      setChatHistories(data.conversations.map(toChatHistory));
    } catch (error) {
      console.error('读取会话列表失败:', error);
    } finally {
      setHistoryReady(true);
    }
  }, []);

  const handleConversationCreated = useCallback(
    (conversationId: string) => {
      setActiveConversationId(conversationId);
      // 首条消息创建会话时替换当前空页 URL，不增加无意义的历史记录。
      syncConversationUrl(conversationId, 'replace');
      void loadHistories();
    },
    [loadHistories, syncConversationUrl]
  );

  const {
    messages,
    isTyping,
    sendMessage,
    clearMessages,
    replaceMessages
  } = useChat({
    conversationId: activeConversationId,
    onConversationCreated: handleConversationCreated,
    onConversationUpdated: loadHistories,
    onError: (error) => console.error('发送消息失败:', error)
  });

  const resetConversation = useCallback(
    (syncUrl: UrlHistoryMode = false) => {
      historyRequestRef.current += 1;
      clearMessages();
      setActiveConversationId(null);
      setInputValue('');

      if (syncUrl) syncConversationUrl(null, syncUrl);
    },
    [clearMessages, syncConversationUrl]
  );

  const loadConversation = useCallback(
    async (conversationId: string, syncUrl: UrlHistoryMode = false) => {
      if (conversationId === activeConversationId) return;

      const requestId = ++historyRequestRef.current;
      clearMessages();
      setActiveConversationId(conversationId);
      setInputValue('');
      if (syncUrl) syncConversationUrl(conversationId, syncUrl);

      try {
        const response = await fetch(`/api/agent/conversations/${conversationId}`);
        if (!response.ok) throw new Error('无法读取会话记录');

        const detail = (await response.json()) as AgentConversationDetail;
        if (requestId !== historyRequestRef.current) return;

        replaceMessages(detail.messages);
      } catch (error) {
        if (requestId === historyRequestRef.current) {
          console.error('读取会话记录失败:', error);
          resetConversation('replace');
        }
      }
    },
    [activeConversationId, clearMessages, replaceMessages, resetConversation, syncConversationUrl]
  );

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    void (async () => {
      await loadHistories();
      const conversationId = getConversationIdFromUrl();
      if (conversationId) void loadConversation(conversationId);
    })();
  }, [loadConversation, loadHistories]);

  useEffect(() => {
    const handlePopState = () => {
      const conversationId = getConversationIdFromUrl();
      if (conversationId) {
        void loadConversation(conversationId);
      } else {
        resetConversation();
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [loadConversation, resetConversation]);

  const handleSend = () => {
    if (!historyReady || !inputValue.trim() || isTyping) return;
    void sendMessage(inputValue);
    setInputValue('');
  };

  const handleNewChat = () => {
    resetConversation('push');
    inputRef.current?.focus();
  };

  const handleDeleteChat = async (conversationId: string) => {
    const isActiveConversation = conversationId === activeConversationId;
    if (isActiveConversation) resetConversation();

    try {
      const response = await fetch(`/api/agent/conversations/${conversationId}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('无法删除会话');

      setChatHistories((previous) =>
        previous.filter((history) => history.id !== conversationId)
      );
      if (isActiveConversation) syncConversationUrl(null, 'replace');
    } catch (error) {
      console.error('删除会话失败:', error);
      void loadHistories();
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion);
    inputRef.current?.focus();
  };

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-lab-ink">
      <ChatSidebar
        chatHistories={chatHistories}
        activeConversationId={activeConversationId}
        onNewChat={handleNewChat}
        onSelectChat={(conversationId) => void loadConversation(conversationId, 'push')}
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
          isTyping={isTyping || !historyReady}
          inputRef={inputRef}
        />
      </main>
    </div>
  );
}
