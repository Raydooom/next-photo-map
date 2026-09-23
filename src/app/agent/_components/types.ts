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
  /** 当前流式回复的照片已缓存，但需等待文字结束后才展示。 */
  photoResultsVisible?: boolean;
  /** 仅当前流式回复首次揭示照片时播放出现动画。 */
  animatePhotoResults?: boolean;
};

export type ChatHistory = {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  preview: string;
};
