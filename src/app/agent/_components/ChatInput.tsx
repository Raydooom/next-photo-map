'use client';

import { RefObject } from 'react';
import { ArrowUp } from 'lucide-react';
import clsx from 'clsx';

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  isTyping?: boolean;
  placeholder?: string;
  inputRef?: RefObject<HTMLTextAreaElement>;
}

/**
 * 输入区。
 *
 * 用原生 textarea 而非 HeroUI 的 Textarea —— 后者自带圆角、聚焦动画与一层
 * inputWrapper，要压成直角得覆盖三四个 classNames，不如直接写。
 * 聚焦态靠描边换成强调色表达，与站内输入框一致。
 */
export function ChatInput({
  value,
  onChange,
  onSend,
  isTyping = false,
  placeholder = '问问这些照片……',
  inputRef
}: ChatInputProps) {
  const canSend = Boolean(value.trim()) && !isTyping;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (canSend) onSend();
    }
  };

  return (
    <footer className="shrink-0 border-t border-lab-line px-4 py-4 md:px-8">
      <div className="mx-auto max-w-3xl">
        <div
          className={clsx(
            'flex items-end gap-2 border border-lab-line bg-lab-raised',
            'transition-colors duration-300 focus-within:border-lab-accent'
          )}
        >
          <textarea
            ref={inputRef}
            rows={1}
            value={value}
            placeholder={placeholder}
            onKeyDown={handleKeyDown}
            onChange={(e) => onChange(e.target.value)}
            className={clsx(
              'min-h-[52px] flex-1 resize-none bg-transparent px-4 py-4',
              'text-sm leading-relaxed text-lab-paper',
              'placeholder:text-lab-faint focus:outline-none'
            )}
          />

          <button
            type="button"
            aria-label="发送"
            disabled={!canSend}
            onClick={onSend}
            className={clsx(
              'mb-2.5 mr-2.5 flex h-8 w-8 shrink-0 items-center justify-center border',
              'transition-colors duration-300',
              canSend
                ? 'border-lab-accent bg-lab-accent text-lab-accent-ink hover:border-lab-accent-hover'
                : 'cursor-not-allowed border-lab-line text-lab-faint',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lab-accent'
            )}
          >
            <ArrowUp size={15} />
          </button>
        </div>

        <p className="lab-mono mt-2 text-[11px] text-lab-faint">
          Enter 发送 · Shift + Enter 换行
        </p>
      </div>
    </footer>
  );
}
