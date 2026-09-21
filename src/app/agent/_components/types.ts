export type Message = {
  id: string;
  conversationId: string;
  role: 'user' | 'ai';
  status: 'loading' | 'done' | 'streaming';
  content: string;
  timestamp: Date;
  type: 'text' | 'photoCard';
  data?: {
    total?: number;
    list?: Array<Record<string, unknown>>;
  };
};

export type ChatHistory = {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  preview: string;
};
