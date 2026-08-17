import clsx from 'clsx';
import { ReactNode } from 'react';

import { Eyebrow } from './Eyebrow';

interface SectionHeadingProps {
  /** 章节序号，如 01 */
  index: string;
  /** 序号右侧的前导文案 */
  eyebrow?: string;
  title: string;
  description?: string;
  /** 右侧动作区，通常是「查看更多」入口 */
  action?: ReactNode;
  className?: string;
}

/**
 * 分区标题。
 * 12 列网格三段式：左侧序号（1-3 列）、中部标题（4-9 列）、右侧动作（10-12 列）；
 * 窄屏退化为单列纵向排布。
 */
export function SectionHeading({
  index,
  eyebrow,
  title,
  description,
  action,
  className
}: SectionHeadingProps) {
  return (
    <div
      className={clsx(
        'lab-grid items-start gap-y-7',
        'mb-[var(--lab-section-gap)]',
        className
      )}
    >
      {/* 序号 */}
      <div className="col-span-full md:col-span-3">
        <Eyebrow className="flex items-baseline gap-3 text-lab-faint">
          <span className="text-lab-accent">{index}</span>
          {eyebrow && <span className="text-lab-muted">{eyebrow}</span>}
        </Eyebrow>
      </div>

      {/* 标题与说明 */}
      <div className="col-span-full md:col-span-6 md:col-start-4">
        <h2 className="lab-title text-lab-paper">{title}</h2>
        {description && (
          <p className="lab-body mt-4 max-w-[38ch] text-lab-muted">
            {description}
          </p>
        )}
      </div>

      {/* 动作 */}
      {action && (
        <div
          className={clsx(
            'col-span-full min-w-0',
            'md:col-span-3 md:col-start-10 md:justify-self-end md:pt-2'
          )}
        >
          {action}
        </div>
      )}
    </div>
  );
}
