'use client';

import clsx from 'clsx';
import { Eyebrow } from '@/components/ui';

interface WelcomeScreenProps {
  suggestions?: string[];
  onSuggestionClick?: (suggestion: string) => void;
}

/**
 * 空态。
 *
 * 不做居中的大图标加渐变色块 —— 站内其余区块都是左对齐的编号加标题，
 * 这里沿用同一套：一行 eyebrow、一句说明、几个可点的起始问题。
 */
export function WelcomeScreen({
  suggestions = [
    '故宫附近拍过什么',
    '找雪山的照片',
    '去年秋天在哪拍的',
    '哪些照片是逆光'
  ],
  onSuggestionClick
}: WelcomeScreenProps) {
  return (
    <div className="py-10">
      <Eyebrow className="block">Agent</Eyebrow>

      <h2 className="mt-3 text-xl text-lab-paper">从一句话开始检索</h2>

      <p className="mt-2 max-w-md text-sm leading-relaxed text-lab-muted">
        照片已按语义建立索引，可以问地点、时间、光线或画面内容。
      </p>

      <ul className="mt-6 grid gap-px border border-lab-line sm:grid-cols-2">
        {suggestions.map((suggestion) => (
          <li key={suggestion} className="bg-lab-line">
            <button
              type="button"
              onClick={() => onSuggestionClick?.(suggestion)}
              className={clsx(
                'group/sug relative isolate flex h-12 w-full items-center overflow-hidden',
                'bg-lab-raised px-4 text-left text-[13px] text-lab-paper',
                'transition-colors duration-300 hover:text-lab-accent-ink',
                'motion-reduce:hover:text-lab-accent',
                'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-lab-accent'
              )}
            >
              {/* 强调色自左铺开，与 LabButton 的悬停动作一致 */}
              <span
                aria-hidden
                className={clsx(
                  'absolute inset-0 -z-10 origin-left scale-x-0 bg-lab-accent',
                  'transition-transform duration-[450ms] ease-[cubic-bezier(0.16,1,0.3,1)]',
                  'group-hover/sug:scale-x-100 motion-reduce:hidden'
                )}
              />
              {suggestion}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
