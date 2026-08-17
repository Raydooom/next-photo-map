'use client';

import { useEffect, useState } from 'react';
import { ArrowUpRight, Sparkles } from 'lucide-react';

import { Eyebrow, LabButton, Reveal } from '@/components/ui';
import { PhotoItem } from '@/types';
import { PhotoTicker } from './PhotoTicker';

/** 在新标签页打开 AI 会话页 */
const openChat = () => window.open('/chat', '_blank');

interface AiCalloutProps {
  /** 作为背景滚动的照片，纯装饰 */
  photos?: PhotoItem[];
}

/**
 * AI 检索入口。
 * 不设描边与底色，区块的存在感交给纵向滚动的照片背景；
 * 强调色只留在 eyebrow 与主按钮上作点缀。
 */
export function AiCallout({ photos = [] }: AiCalloutProps) {
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
    // 上方留白刻意大于常规章节间距，与足迹地图区块拉开距离
    <section className="lab-shell pb-[var(--lab-section-gap)] pt-10 md:pt-20">
      <Reveal>
        {/* 上下留出更大面积，让背景照片墙铺得开 */}
        <div className="relative overflow-hidden px-6 py-20 md:px-10 md:py-32">
          <PhotoTicker photos={photos} />

          {/* relative 使内容压在滚动背景之上 */}
          <div className="lab-grid relative items-end gap-y-8">
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
        </div>
      </Reveal>
    </section>
  );
}
