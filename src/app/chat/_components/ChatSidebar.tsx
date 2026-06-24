'use client';

import { ScrollShadow } from '@heroui/scroll-shadow';
import { Button } from '@heroui/button';
import { Plus, Trash2, Camera, Sparkles } from 'lucide-react';
import { ChatHistory } from './types';

interface ChatSidebarProps {
  chatHistories: ChatHistory[];
  onNewChat?: () => void;
  onDeleteChat?: (id: string) => void;
}

export function ChatSidebar({
  chatHistories,
  onNewChat,
  onDeleteChat
}: ChatSidebarProps) {
  return (
    <aside className="hidden md:flex flex-col w-[280px] border-r border-divider bg-gradient-to-b from-content1 to-content2">
      {/* Logo 区域 */}
      <div className="p-5 border-b border-divider/50">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
            <Camera className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg">摄影助手</h1>
            <p className="text-xs text-default-500">AI 智能分析</p>
          </div>
        </div>
        <Button
          className="w-full font-medium bg-primary/10 hover:bg-primary/20 text-primary"
          variant="flat"
          startContent={<Plus size={18} />}
          onPress={onNewChat}
        >
          新建对话
        </Button>
      </div>

      {/* 历史对话列表 */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="px-4 py-2">
          <p className="text-xs font-medium text-default-400 uppercase tracking-wide">
            历史对话
          </p>
        </div>
        <ScrollShadow className="flex-1 px-3">
          {chatHistories.map((chat) => (
            <div
              key={chat.id}
              className="group p-3 my-1 rounded-xl hover:bg-content2 cursor-pointer transition-all duration-200 border border-transparent hover:border-divider"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-default-700 truncate">
                    {chat.title}
                  </p>
                  <p className="text-xs text-default-400 mt-1 truncate">
                    {chat.preview}
                  </p>
                </div>
                <Button
                  isIconOnly
                  size="sm"
                  variant="light"
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                  onPress={() => onDeleteChat?.(chat.id)}
                >
                  <Trash2 size={14} className="text-default-400" />
                </Button>
              </div>
            </div>
          ))}
        </ScrollShadow>
      </div>

      {/* 底部信息 */}
      <div className="p-4 border-t border-divider/50">
        <div className="flex items-center gap-2 text-xs text-default-400">
          <Sparkles size={12} />
          <span>Powered by Moondream & Qwen</span>
        </div>
      </div>
    </aside>
  );
}
