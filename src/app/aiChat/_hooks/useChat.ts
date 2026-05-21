import { useState, useCallback, useRef } from 'react';
import { fetchEventSource } from '@microsoft/fetch-event-source';
import { Message } from '../_components/types';

const generateId = () =>
  `${Date.now()}_${Math.random().toString(36).substring(2)}`;

interface UseChatOptions {
  onError?: (error: Error) => void;
  onComplete?: () => void;
}

interface UseChatReturn {
  messages: Message[];
  isTyping: boolean;
  sendMessage: (content: string) => Promise<void>;
  clearMessages: () => void;
  abortRef: React.MutableRefObject<AbortController | null>;
}

export function useChat(options: UseChatOptions = {}): UseChatReturn {
  const { onError, onComplete } = options;
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const updateMessage = useCallback(
    (id: string, updater: (msg: Message) => Message) => {
      setMessages((prev) =>
        prev.map((msg) => (msg.id === id ? updater(msg) : msg))
      );
    },
    []
  );

  const addMessage = useCallback((message: Message) => {
    setMessages((prev) => [...prev, message]);
  }, []);

  const removeLoadingMessages = useCallback(() => {
    setMessages((prev) => prev.filter((msg) => msg.status !== 'loading'));
  }, []);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isTyping) return;

      // 用户消息
      const userMessage: Message = {
        id: `user_${generateId()}`,
        chatId: generateId(),
        role: 'user',
        status: 'done',
        content: content.trim(),
        timestamp: new Date(),
        type: 'text'
      };

      addMessage(userMessage);
      setIsTyping(true);

      // AI 消息占位
      const aiMessageId = `ai_${generateId()}`;

      abortRef.current = new AbortController();

      try {
        await fetchEventSource('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: abortRef.current.signal,
          body: JSON.stringify({
            inputText: userMessage.content,
            id: aiMessageId
          }),
          onmessage: (event) => {
            const data = JSON.parse(event.data);

            // 处理不同消息类型
            if (data.status === 'loading') {
              addMessage({
                id: aiMessageId,
                chatId: generateId(),
                role: 'ai',
                status: 'loading',
                content: '',
                timestamp: new Date(),
                type: 'text'
              });
            } else if (data.type === 'photoCard') {
              removeLoadingMessages();
              addMessage({
                id: aiMessageId,
                chatId: generateId(),
                role: 'ai',
                status: 'done',
                content: data.message || '',
                timestamp: new Date(),
                type: 'photoCard',
                data: data.data
              });
            } else {
              // 流式文本：追加内容
              removeLoadingMessages();
              updateMessage(aiMessageId, (msg) => ({
                ...msg,
                content: msg.content + (data.message || ''),
                status: data.status
              }));

              // 首次创建消息
              setMessages((prev) => {
                if (!prev.some((msg) => msg.id === aiMessageId)) {
                  return [
                    ...prev,
                    {
                      id: aiMessageId,
                      chatId: generateId(),
                      role: 'ai',
                      status: 'streaming',
                      content: data.message || '',
                      timestamp: new Date(),
                      type: 'text'
                    }
                  ];
                }
                return prev;
              });
            }

            if (data.status === 'done') {
              setIsTyping(false);
              abortRef.current?.abort();
              onComplete?.();
            }
          },
          onerror: (err) => {
            setIsTyping(false);
            onError?.(err as Error);
          },
          onclose: () => {
            setIsTyping(false);
          }
        });
      } catch (error) {
        setIsTyping(false);
        onError?.(error as Error);
      }
    },
    [
      isTyping,
      addMessage,
      removeLoadingMessages,
      updateMessage,
      onError,
      onComplete
    ]
  );

  const clearMessages = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
    setIsTyping(false);
  }, []);

  return {
    messages,
    isTyping,
    sendMessage,
    clearMessages,
    abortRef
  };
}
