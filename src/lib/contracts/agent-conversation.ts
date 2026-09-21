import type { PhotoItem } from '@/lib/types/photo';

export type AgentConversationSummary = {
  id: string;
  title: string;
  preview: string;
  createdAt: string;
  updatedAt: string;
};

export type AgentConversationMessage = {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant';
  kind: 'text' | 'photoResults';
  status: 'completed' | 'interrupted' | 'error';
  content: string;
  photoTotal?: number | null;
  photos?: PhotoItem[];
  createdAt: string;
};

export type AgentConversationDetail = {
  conversation: AgentConversationSummary;
  messages: AgentConversationMessage[];
};
