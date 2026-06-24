'use client';

import { Button } from '@heroui/button';
import { Textarea } from '@heroui/input';
import { Send, Image as ImageIcon } from 'lucide-react';
import { cn } from '@heroui/theme';
import { RefObject } from 'react';

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  isTyping?: boolean;
  placeholder?: string;
  inputRef?: RefObject<HTMLTextAreaElement>;
}

export function ChatInput({
  value,
  onChange,
  onSend,
  isTyping = false,
  placeholder = '问问 AI 摄影助手...',
  inputRef
}: ChatInputProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <footer className="px-4 md:px-8 pb-6 pt-2">
      <div className="max-w-3xl mx-auto">
        <div className="relative bg-content1 rounded-2xl border border-divider shadow-lg hover:shadow-xl transition-shadow">
          <Textarea
            ref={inputRef as any}
            variant="underlined"
            placeholder={placeholder}
            disableAnimation
            disableAutosize
            value={value}
            onKeyDown={handleKeyDown}
            classNames={{
              input: 'min-h-[56px] py-4 px-5 text-sm',
              inputWrapper: 'border-none bg-transparent',
              innerWrapper: 'pb-0'
            }}
            onValueChange={onChange}
          />
          <div className="absolute right-3 bottom-3 flex items-center gap-2">
            <span className="text-xs text-default-300 hidden sm:block">
              Enter 发送
            </span>
            <Button
              isIconOnly
              size="sm"
              color="primary"
              className={cn(
                'rounded-xl transition-all',
                value.trim() ? 'scale-100' : 'scale-90 opacity-50'
              )}
              isDisabled={!value.trim() || isTyping}
              onPress={onSend}
            >
              <Send size={16} />
            </Button>
          </div>
        </div>
        <p className="text-center text-xs text-default-400 mt-3 flex items-center justify-center gap-1">
          <ImageIcon size={12} />
          <span>支持照片搜索、构图分析、光影解读</span>
        </p>
      </div>
    </footer>
  );
}
