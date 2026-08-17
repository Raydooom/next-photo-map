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
 * 序号、标题、说明左对齐成一组，动作贴右并与标题底边对齐；
 * 顶部一条通栏细线标记章节起点。
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
        'border-t border-lab-line pt-7',
        'mb-[var(--lab-section-gap)]',
        className
      )}
    >
      {/* 序号与前导文案 */}
      <Eyebrow className="flex items-baseline gap-3">
        <span className="text-lab-accent">{index}</span>
        {eyebrow && <span className="text-lab-muted">{eyebrow}</span>}
      </Eyebrow>

      {/* 标题与动作同行，底边对齐 */}
      <div className="mt-6 flex flex-wrap items-end justify-between gap-x-10 gap-y-4">
        <h2 className="lab-title min-w-0 text-lab-paper">{title}</h2>
        {action && <div className="shrink-0 pb-0.5">{action}</div>}
      </div>

      {description && (
        <p className="lab-body mt-4 max-w-[38ch] text-lab-muted">
          {description}
        </p>
      )}
    </div>
  );
}
