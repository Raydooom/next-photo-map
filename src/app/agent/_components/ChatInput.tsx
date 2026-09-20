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
        {/*
          输入框是控件而非内容，需要明确的可输入边界，故保留整圈描边。
          聚焦转整圈描边而非单边亮线 —— 后者横贯整个宽度，分量会盖过按钮。

          底色分主题取值，因为「凹陷」的明度方向在两个主题下是相反的：
          亮色用 sunken，白底上挖一块浅灰，读作凹陷；
          暗色改用 raised，因为 sunken(0.115) 比页面底 ink(0.145) 更暗，
          而深色界面里「更暗」读作沉降或禁用，不是可输入。
        */}
        <div
          className={clsx(
            'flex items-end gap-2 px-3 py-2.5',
            'border border-lab-line bg-lab-sunken',
            'dark:border-lab-line-strong dark:bg-lab-raised',
            'transition-colors duration-300',
            'focus-within:border-lab-accent dark:focus-within:border-lab-accent'
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
              // 常态就给到两行高度：换行后仍能看到内容，
              // 也避免 768px 宽配单行高的扁长比例
              'lab-body max-h-40 min-h-[52px] flex-1 resize-none bg-transparent px-1 py-1',
              // placeholder 用 muted 而非 faint：它要说明「这里能输入什么」，
              // faint 是给纯装饰文字的档位
              'text-lab-paper placeholder:text-lab-muted focus:outline-none'
            )}
          />

          <button
            type="button"
            aria-label="发送"
            disabled={!canSend}
            onClick={onSend}
            className={clsx(
              'flex h-9 w-9 shrink-0 items-center justify-center border',
              'transition-colors duration-300',
              // 可发送时是实底色块；不可发送时保留可辨的描边与图标，
              // 让人看得出「这里有个按钮，只是现在不能点」
              canSend
                ? 'border-lab-accent bg-lab-accent text-lab-accent-ink hover:border-lab-accent-hover hover:bg-lab-accent-hover'
                : 'cursor-not-allowed border-lab-line text-lab-muted',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lab-accent'
            )}
          >
            <ArrowUp size={15} />
          </button>
        </div>

        {/* 中英混排，不能用 lab-mono：0.12em 字距会把中文拆散 */}
        <p className="mt-2.5 text-[11px] text-lab-faint">
          Enter 发送 · Shift + Enter 换行
        </p>
      </div>
    </footer>
  );
}
