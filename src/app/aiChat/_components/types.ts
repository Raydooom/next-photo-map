export type Message = {
  id: string;
  chatId: string;
  role: 'user' | 'ai';
  status: 'loading' | 'done' | 'streaming';
  content: string;
  timestamp: Date;
  type: 'text' | 'photoCard';
  data?: any;
};

export type ChatHistory = {
  id: string;
  title: string;
  createdAt: Date;
  preview: string;
};
