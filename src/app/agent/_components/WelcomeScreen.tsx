'use client';

import clsx from 'clsx';
import { Eyebrow } from '@/components/ui';

interface WelcomeScreenProps {
  suggestions?: string[];
  onSuggestionClick?: (suggestion: string) => void;
}

/** 新会话空态：用生活化问题引导用户翻找照片。 */
export function WelcomeScreen({
  suggestions = [
    '去年春天都拍了些什么？',
    '在北京朝阳区拍过什么？',
    '有没有逆光拍的照片？',
    '用 iPhone 16 Pro 拍过什么？'
  ],
  onSuggestionClick
}: WelcomeScreenProps) {
  return (
    <div className="pb-10 pt-4 md:pt-[6vh]">
      <Eyebrow className="block">Photo Companion</Eyebrow>

      <h2 className="lab-title mt-4 max-w-[14ch] text-lab-paper">
        想起什么，就问问照片。
      </h2>

      <p className="lab-body mt-4 max-w-[42ch] text-lab-muted">
        想找哪次出游、哪个地方，或某种画面？说说看，我会把相关照片翻出来。
      </p>

      <p className="lab-action mt-8 text-lab-faint">试着这样问</p>
      <ul className="mt-3 grid gap-px border border-lab-line sm:grid-cols-2">
        {suggestions.map((suggestion) => (
          <li key={suggestion} className="bg-lab-line">
            <button
              type="button"
              onClick={() => onSuggestionClick?.(suggestion)}
              className={clsx(
                'group/sug lab-action flex h-12 w-full cursor-pointer items-center gap-2.5',
                'bg-lab-raised px-4 text-left text-lab-muted',
                'transition-colors duration-300',
                'hover:bg-lab-paper/5 hover:text-lab-paper',
                'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-lab-accent'
              )}
            >
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
