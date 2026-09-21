import type { PhotoItem } from '@/lib/types/photo';

export type Message = {
  id: string;
  conversationId: string;
  role: 'user' | 'ai';
  status: 'loading' | 'done' | 'streaming';
  content: string;
  timestamp: Date;
  type: 'text' | 'photoCard';
  data?: {
    total: number;
    list: PhotoItem[];
  };
};

export type ChatHistory = {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  preview: string;
};
