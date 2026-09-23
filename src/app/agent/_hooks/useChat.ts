import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchEventSource } from '@microsoft/fetch-event-source';
import type { PhotoItem } from '@/lib/types/photo';
import type { AgentConversationMessage } from '@/lib/contracts/agent-conversation';
import { Message } from '../_components/types';

const generateId = () =>
  `${Date.now()}_${Math.random().toString(36).substring(2)}`;

interface UseChatOptions {
  conversationId: string | null;
  onConversationCreated?: (conversationId: string) => void;
  onConversationUpdated?: () => void;
  onError?: (error: Error) => void;
  onComplete?: () => void;
}

interface UseChatReturn {
  messages: Message[];
  isTyping: boolean;
  sendMessage: (content: string) => Promise<void>;
  clearMessages: () => void;
  replaceMessages: (messages: AgentConversationMessage[]) => void;
  abortRef: React.MutableRefObject<AbortController | null>;
}

interface ChatEventData {
  conversationId?: string;
  userMessage?: AgentConversationMessage;
  assistantMessage?: AgentConversationMessage | null;
  photoResult?: {
    total: number;
    photos: PhotoItem[];
  };
}

function revivePhoto(photo: PhotoItem): PhotoItem {
  return {
    ...photo,
    takenAt: photo.takenAt ? new Date(photo.takenAt) : null,
    createdAt: new Date(photo.createdAt),
    updatedAt: new Date(photo.updatedAt)
  };
}

function fromStoredMessage(message: AgentConversationMessage): Message {
  const photos = message.photos?.map(revivePhoto);

  return {
    id: message.id,
    conversationId: message.conversationId,
    role: message.role === 'assistant' ? 'ai' : 'user',
    status: 'done',
    content: message.content,
    timestamp: new Date(message.createdAt),
    type: message.kind === 'photoResults' ? 'photoCard' : 'text',
    ...(photos && photos.length > 0
      ? {
          data: {
            total: message.photoTotal ?? photos.length,
            list: photos
          },
          photoResultsVisible: true,
          animatePhotoResults: false
        }
      : {})
  };
}

function createAssistantMessage(
  id: string,
  conversationId: string,
  status: Message['status'],
  content = ''
): Message {
  return {
    id,
    conversationId,
    role: 'ai',
    status,
    content,
    timestamp: new Date(),
    type: 'text'
  };
}

export function useChat(options: UseChatOptions): UseChatReturn {
  const {
    conversationId,
    onConversationCreated,
    onConversationUpdated,
    onError,
    onComplete
  } = options;
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const activeConversationRef = useRef<string | null>(conversationId);

  useEffect(() => {
    activeConversationRef.current = conversationId;
  }, [conversationId]);

  const replaceMessages = useCallback((storedMessages: AgentConversationMessage[]) => {
    setMessages(storedMessages.map(fromStoredMessage));
  }, []);

  const ensureAssistantMessage = useCallback(
    (id: string, currentConversationId: string) => {
      setMessages((prev) => {
        if (prev.some((message) => message.id === id)) return prev;
        return [
          ...prev,
          createAssistantMessage(id, currentConversationId, 'loading')
        ];
      });
    },
    []
  );

  const appendAssistantText = useCallback((id: string, delta: string) => {
    setMessages((prev) =>
      prev.map((message) =>
        message.id === id
          ? {
              ...message,
              status: 'streaming',
              content: message.content + delta
            }
          : message
      )
    );
  }, []);

  const applyPhotoResult = useCallback(
    (id: string, result: NonNullable<ChatEventData['photoResult']>) => {
      setMessages((prev) =>
        prev.map((message) =>
          message.id === id
            ? {
                ...message,
                type: 'photoCard',
                data: {
                  total: result.total,
                  list: result.photos.map(revivePhoto)
                },
                photoResultsVisible: false,
                animatePhotoResults: false
              }
            : message
        )
      );
    },
    []
  );

  const revealPhotoResults = useCallback((id: string) => {
    setMessages((prev) =>
      prev.map((message) =>
        message.id === id && message.data?.list.length
          ? {
              ...message,
              photoResultsVisible: true,
              animatePhotoResults: true
            }
          : message
      )
    );
  }, []);

  const reconcileMessage = useCallback(
    (localId: string, storedMessage: AgentConversationMessage) => {
      const persisted = fromStoredMessage(storedMessage);

      setMessages((prev) =>
        prev.map((message) => {
          if (message.id !== localId) return message;

          const hasPhotos = Boolean(persisted.data?.list.length);
          return {
            ...persisted,
            // SSE done 的正文为空时，保留已逐字显示的内容，避免视觉跳动。
            content: message.content || persisted.content,
            ...(hasPhotos
              ? {
                  photoResultsVisible: true,
                  animatePhotoResults: true
                }
              : {})
          };
        })
      );
    },
    []
  );

  const failAssistantMessage = useCallback((id: string, errorMessage: string) => {
    setMessages((prev) =>
      prev.map((message) =>
        message.id === id
          ? { ...message, status: 'done', content: message.content || errorMessage }
          : message
      )
    );
  }, []);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isTyping) return;

      const localUserId = `user_${generateId()}`;
      const localAssistantId = `assistant_${generateId()}`;
      let requestConversationId = conversationId;
      const inputText = content.trim();

      setMessages((prev) => [
        ...prev,
        {
          id: localUserId,
          conversationId: requestConversationId ?? 'pending',
          role: 'user',
          status: 'done',
          content: inputText,
          timestamp: new Date(),
          type: 'text'
        }
      ]);
      setIsTyping(true);

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
            inputText,
            ...(requestConversationId ? { conversationId: requestConversationId } : {})
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
            const data = JSON.parse(event.data) as {
              status: string;
              message?: string;
              data?: ChatEventData;
            };
            const eventData = data.data;

            if (eventData?.conversationId) {
              requestConversationId = eventData.conversationId;
            }

            // 切换会话后，旧 SSE 即使晚到也不得覆盖当前会话 UI。
            if (
              requestConversationId &&
              activeConversationRef.current &&
              activeConversationRef.current !== requestConversationId
            ) {
              return;
            }

            if (data.status === 'loading') {
              if (!requestConversationId) return;

              if (eventData?.userMessage) {
                reconcileMessage(localUserId, eventData.userMessage);
              }
              ensureAssistantMessage(localAssistantId, requestConversationId);
              onConversationCreated?.(requestConversationId);
              return;
            }

            if (data.status === 'photo-results') {
              if (eventData?.photoResult) {
                applyPhotoResult(localAssistantId, eventData.photoResult);
              }
              return;
            }

            if (data.status === 'streaming') {
              appendAssistantText(localAssistantId, data.message || '');
              return;
            }

            if (data.status === 'done') {
              receivedTerminalEvent = true;
              if (eventData?.assistantMessage) {
                reconcileMessage(localAssistantId, eventData.assistantMessage);
              } else {
                revealPhotoResults(localAssistantId);
              }
              finishCurrentRequest();
              onConversationUpdated?.();
              onComplete?.();
              return;
            }

            if (data.status === 'error') {
              receivedTerminalEvent = true;
              const errorMessage = data.message || '处理请求时发生错误，请稍后重试';
              if (eventData?.assistantMessage) {
                reconcileMessage(localAssistantId, eventData.assistantMessage);
              } else {
                revealPhotoResults(localAssistantId);
                failAssistantMessage(localAssistantId, errorMessage);
              }
              finishCurrentRequest();
              onConversationUpdated?.();
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
              revealPhotoResults(localAssistantId);
              onError?.(new Error('Agent 响应流意外结束'));
            }
          }
        });
      } catch (error) {
        finishCurrentRequest();
        if (!requestController.signal.aborted) {
          revealPhotoResults(localAssistantId);
          failAssistantMessage(
            localAssistantId,
            error instanceof Error ? error.message : '发送消息失败'
          );
          onError?.(error as Error);
        }
      }
    },
    [
      conversationId,
      isTyping,
      ensureAssistantMessage,
      appendAssistantText,
      applyPhotoResult,
      revealPhotoResults,
      reconcileMessage,
      failAssistantMessage,
      onConversationCreated,
      onConversationUpdated,
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
    replaceMessages,
    abortRef
  };
}
