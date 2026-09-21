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

function createAssistantMessage(
  id: string,
  status: Message['status'],
  content = ''
): Message {
  return {
    id,
    chatId: id,
    role: 'ai',
    status,
    content,
    timestamp: new Date(),
    type: 'text'
  };
}

export function useChat(options: UseChatOptions = {}): UseChatReturn {
  const { onError, onComplete } = options;
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const addMessage = useCallback((message: Message) => {
    setMessages((prev) => [...prev, message]);
  }, []);

  const ensureAssistantMessage = useCallback((id: string) => {
    setMessages((prev) => {
      if (prev.some((message) => message.id === id)) return prev;
      return [...prev, createAssistantMessage(id, 'loading')];
    });
  }, []);

  const appendAssistantText = useCallback((id: string, delta: string) => {
    setMessages((prev) => {
      const existing = prev.find((message) => message.id === id);

      if (!existing) {
        return [...prev, createAssistantMessage(id, 'streaming', delta)];
      }

      return prev.map((message) =>
        message.id === id
          ? {
              ...message,
              status: 'streaming',
              content: message.content + delta
            }
          : message
      );
    });
  }, []);

  const settleAssistantMessage = useCallback(
    (id: string, finalContent = '') => {
      setMessages((prev) => {
        const existing = prev.find((message) => message.id === id);

        if (!existing) {
          return [...prev, createAssistantMessage(id, 'done', finalContent)];
        }

        return prev.map((message) =>
          message.id === id
            ? {
                ...message,
                status: 'done',
                // 流式链路的 done 不携带正文；兼容非流式终态才补全文本。
                content:
                  message.content || finalContent
                    ? message.content || finalContent
                    : '没有生成可展示的回答'
              }
            : message
        );
      });
    },
    []
  );

  const failAssistantMessage = useCallback((id: string, errorMessage: string) => {
    setMessages((prev) => {
      const existing = prev.find((message) => message.id === id);

      if (!existing) {
        return [...prev, createAssistantMessage(id, 'done', errorMessage)];
      }

      return prev.map((message) =>
        message.id === id
          ? {
              ...message,
              status: 'done',
              content: message.content || errorMessage
            }
          : message
      );
    });
  }, []);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isTyping) return;

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

      const aiMessageId = `ai_${generateId()}`;
      const requestController = new AbortController();
      abortRef.current = requestController;
      let receivedTerminalEvent = false;

      const finishCurrentRequest = () => {
        if (abortRef.current === requestController) {
          abortRef.current = null;
          setIsTyping(false);
        }
      };

      try {
        await fetchEventSource('/api/agent/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: requestController.signal,
          body: JSON.stringify({
            inputText: userMessage.content,
            id: aiMessageId
          }),
          // 对 POST 对话请求保持连接，不允许库在页面切回前台时重放同一条消息。
          openWhenHidden: true,
          onopen: async (response) => {
            const contentType = response.headers.get('content-type');
            if (!response.ok || !contentType?.startsWith('text/event-stream')) {
              throw new Error(`Agent 响应异常: ${response.status}`);
            }
          },
          onmessage: (event) => {
            const data = JSON.parse(event.data);

            if (data.status === 'loading') {
              ensureAssistantMessage(aiMessageId);
              return;
            }

            if (data.status === 'streaming') {
              appendAssistantText(aiMessageId, data.message || '');
              return;
            }

            if (data.status === 'done') {
              receivedTerminalEvent = true;
              settleAssistantMessage(aiMessageId, data.message || '');
              finishCurrentRequest();
              onComplete?.();
              return;
            }

            if (data.status === 'error') {
              receivedTerminalEvent = true;
              const errorMessage = data.message || '处理请求时发生错误，请稍后重试';
              failAssistantMessage(aiMessageId, errorMessage);
              finishCurrentRequest();
              onError?.(new Error(errorMessage));
            }
          },
          // fetchEventSource 默认会在 onerror 未抛错时重试。聊天 POST 不可安全重放，
          // 所有传输错误交给外层 catch 处理，明确终止本次请求。
          onerror: (error) => {
            throw error;
          },
          onclose: () => {
            const isCurrentRequest = abortRef.current === requestController;
            finishCurrentRequest();

            if (
              isCurrentRequest &&
              !receivedTerminalEvent &&
              !requestController.signal.aborted
            ) {
              onError?.(new Error('Agent 响应流意外结束'));
            }
          }
        });
      } catch (error) {
        finishCurrentRequest();
        if (!requestController.signal.aborted) {
          onError?.(error as Error);
        }
      }
    },
    [
      isTyping,
      addMessage,
      ensureAssistantMessage,
      appendAssistantText,
      settleAssistantMessage,
      failAssistantMessage,
      onError,
      onComplete
    ]
  );

  const clearMessages = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
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
