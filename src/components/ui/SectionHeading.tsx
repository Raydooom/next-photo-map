import clsx from 'clsx';
import { ReactNode } from 'react';

import { Eyebrow } from './Eyebrow';

interface SectionHeadingProps {
  /** 章节序号，如 01 */
  index: string;
  /** 序号右侧的前导文案 */
  eyebrow?: string;
  /**
   * 大标题。省略时只留细线与序号行，
   * 适用于内容自身就是主体、再加一个大标题反而抢戏的分区，如读数网格
   */
  title?: string;
  description?: string;
  /** 右侧动作区，通常是「查看更多」入口 */
  action?: ReactNode;
  className?: string;
}

/**
 * 分区标题。
 * 序号、标题、说明左对齐成一组，动作贴右并与标题底边对齐；
 * 顶部一条通栏细线标记章节起点。
 *
 * 三行文本各自很矮，间距按大留白排就会让标题占掉半屏、把内容压到首屏之外，
 * 因此段间距只取到能分出层级的程度，靠细线和字号差建立结构。
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
        'border-t border-lab-line pt-5',
        'mb-[var(--lab-heading-gap)]',
        className
      )}
    >
      {/* 序号与前导文案 */}
      <Eyebrow className="flex items-baseline gap-3">
        <span className="text-lab-accent">{index}</span>
        {eyebrow && <span className="text-lab-muted">{eyebrow}</span>}
      </Eyebrow>

      {/* 标题与动作同行，底边对齐；ml-auto 保证无标题时动作仍贴右 */}
      {(title || action) && (
        <div className="mt-3 flex flex-wrap items-end justify-between gap-x-10 gap-y-3">
          {title && (
            <h2 className="lab-title min-w-0 text-lab-paper">{title}</h2>
          )}
          {action && <div className="ml-auto shrink-0 pb-0.5">{action}</div>}
        </div>
      )}

      {description && (
        <p className="lab-body mt-2.5 max-w-[38ch] text-lab-muted">
          {description}
        </p>
      )}
    </div>
  );
}
