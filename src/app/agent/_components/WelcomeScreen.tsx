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
    '查找去年秋天拍摄的照片',
    '找雪山的照片',
    '去年秋天在哪拍的',
    '哪些照片是逆光'
  ],
  onSuggestionClick
}: WelcomeScreenProps) {
  return (
    // 往下沉一段，标题落在视线自然停留的位置，而不是顶着滚动区上沿
    <div className="pb-10 pt-6 md:pt-[12vh]">
      <Eyebrow className="block">Agent</Eyebrow>

      {/* <h2 className="lab-title mt-4 text-lab-paper">从一句话开始检索</h2> */}

      <p className="lab-body mt-4 max-w-[38ch] text-lab-muted">
        照片已按语义建立索引，可以问地点、时间、光线或画面内容。
      </p>

      <ul className="mt-6 grid gap-px border border-lab-line sm:grid-cols-2">
        {suggestions.map((suggestion) => (
          <li key={suggestion} className="bg-lab-line">
            {/*
              悬停不铺强调色：LabButton 那套自左铺满能成立是因为按钮面积小、
              且是页面唯一行动点；铺到列表项上面积放大十几倍就成了噪音。
              这里沿用站内列表项的做法，只做一档中性明度变化。
            */}
            <button
              type="button"
              onClick={() => onSuggestionClick?.(suggestion)}
              className={clsx(
                'group/sug lab-action flex h-12 w-full items-center gap-2.5',
                'bg-lab-raised px-4 text-left text-lab-muted',
                'transition-colors duration-300',
                'hover:bg-lab-paper/5 hover:text-lab-paper',
                'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-lab-accent'
              )}
            >
              {/* 与用户消息同一个标记语言：一条 2px 竖线，只在悬停时出现 */}
              <span
                aria-hidden
                className={clsx(
                  'h-3.5 w-[2px] shrink-0 bg-transparent transition-colors duration-300',
                  'group-hover/sug:bg-lab-accent'
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
