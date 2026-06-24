'use client';

import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import clsx from 'clsx';

interface AiSearchBoxProps {
  className?: string;
}

export function AiSearchBox({ className }: AiSearchBoxProps) {
  const [shortcutKey, setShortcutKey] = useState('⌘K');

  useEffect(() => {
    const mac = navigator.userAgent.toLowerCase().includes('mac');
    setShortcutKey(mac ? '⌘K' : 'Ctrl+K');

    const handler = (e: KeyboardEvent) => {
      const mod = mac ? e.metaKey : e.ctrlKey;
      if (mod && e.key === 'k') {
        e.preventDefault();
        window.open('/chat', '_blank');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <div className={clsx('overflow-hidden', className)}>
      <div
        className={clsx(
          'relative pm-rounded p-[1px] animate-gradient-shift group',
          'transition-all duration-300',
          'group-hover:shadow-[0_0_30px_rgb(99_102_241/0.35)]'
        )}
        style={{
          background:
            'linear-gradient(135deg, #6366f1, #06b6d4, #a855f7, #6366f1)'
        }}
      >
        <button
          onClick={() => window.open('/chat', '_blank')}
          className={clsx(
            'relative w-full flex items-center gap-2 px-4 py-2.5 pm-rounded cursor-pointer',
            'bg-background/70 backdrop-blur-md',
            'text-sm text-main/80',
            'transition-all duration-300',
            'group-hover:bg-background/90 group-hover:text-main',
            'group-hover:shadow-[0_0_20px_rgb(var(--primary)/0.3)]',
            'group-hover:shadow-primary/20',
          )}
        >
          <Sparkles
            className={clsx(
              'w-4 h-4 shrink-0 transition-all duration-100',
              'text-default-400 group-hover:text-primary',
              'group-hover:drop-shadow-[0_0_6px_rgb(var(--primary)/0.6)]'
            )}
          />
          <span className="font-medium">AI搜索 / AI分析</span>
          <kbd
            className={clsx(
              'ml-auto text-xs leading-none px-2 py-1 rounded',
              'border-glass bg-background/60',
              'text-main group-hover:text-main',
              'transition-colors duration-100'
            )}
          >
            {shortcutKey}
          </kbd>
        </button>
      </div>
    </div>
  );
}
