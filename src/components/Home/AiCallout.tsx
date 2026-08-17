'use client';

import { useEffect, useState } from 'react';
import { ArrowUpRight, Sparkles } from 'lucide-react';

import { Eyebrow, LabButton, Reveal } from '@/components/ui';

/** 在新标签页打开 AI 会话页 */
const openChat = () => window.open('/chat', '_blank');

/**
 * AI 检索入口。
 * 强调色浅底 + 强调色描边，是首页唯一大面积使用强调色的区块。
 */
export function AiCallout() {
  const [shortcut, setShortcut] = useState('⌘K');

  useEffect(() => {
    const isMac = navigator.userAgent.toLowerCase().includes('mac');
    setShortcut(isMac ? '⌘K' : 'Ctrl+K');

    const onKeyDown = (event: KeyboardEvent) => {
      const withModifier = isMac ? event.metaKey : event.ctrlKey;
      if (withModifier && event.key === 'k') {
        event.preventDefault();
        openChat();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <section className="lab-shell pb-[var(--lab-section-gap)]">
      <Reveal>
        <div className="lab-grid items-end gap-y-8 border border-lab-accent/35 bg-lab-accent-faint px-6 py-10 md:px-10 md:py-14">
          <div className="col-span-full md:col-span-7">
            <Eyebrow className="flex items-center gap-2 text-lab-accent">
              <Sparkles className="h-3.5 w-3.5" />
              AI search
            </Eyebrow>

            <h2 className="lab-title mt-5 text-lab-paper">
              Ask the archive.
            </h2>
            <p className="lab-body mt-4 max-w-[42ch] text-lab-muted">
              用自然语言检索这些照片：按地点、时间、拍摄参数，或者直接描述画面内容。
            </p>
          </div>

          <div className="col-span-full flex items-center gap-4 md:col-span-4 md:col-start-9 md:justify-self-end">
            <LabButton
              variant="primary"
              onClick={openChat}
              endContent={<ArrowUpRight className="h-3.5 w-3.5" />}
            >
              开始提问
            </LabButton>
            <kbd className="lab-mono hidden border border-lab-line-strong px-2.5 py-1.5 text-lab-muted sm:block">
              {shortcut}
            </kbd>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
