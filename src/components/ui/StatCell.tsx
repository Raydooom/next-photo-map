import clsx from 'clsx';
import { ReactNode } from 'react';

interface StatCellProps {
  /** 序号，如 01 */
  index: string;
  value: ReactNode;
  /** 英文标签，等宽字体呈现 */
  label: string;
  /** 中文补充说明 */
  hint?: string;
  className?: string;
}

/**
 * 数据单元格。
 * 自身不带描边，由外层网格用「每格右下描边 + 容器左上描边」的方式拼出连续网格线。
 *
 * 序号与英文标签同属编号性质的元信息，合并到顶行；
 * 数值之下只留中文释义 —— 它才是读者真正要读的那句话，
 * 因此取正文字号，不能和 mono 标签一样缩到 11-12px 的注脚尺寸。
 */
export function StatCell({
  index,
  value,
  label,
  hint,
  className
}: StatCellProps) {
  return (
    <div
      className={clsx(
        'flex min-w-0 flex-col justify-between gap-5',
        'px-5 py-6 md:px-6 md:py-7',
        className
      )}
    >
      {/* 序号与标签同为 faint：格内编号纯装饰、不承载信息，
          用 accent 会比下面的中文释义还抢眼，把层级倒过来。
          accent 留给章节序号，这一屏只出现一次才指得清章节起点 */}
      <div className="flex items-baseline gap-2.5">
        <span className="lab-mono text-lab-faint">{index}</span>
        <span className="lab-mono truncate text-lab-faint">{label}</span>
      </div>

      <div className="min-w-0">
        <p
          className={clsx(
            'text-[clamp(30px,3.6vw,42px)] leading-none tabular-nums',
            'tracking-[-0.03em] text-lab-paper',
            "[font-variation-settings:'wght'_660]"
          )}
        >
          {value}
        </p>
        {hint && (
          <p className="mt-2.5 truncate text-sm text-lab-muted">{hint}</p>
        )}
      </div>
    </div>
  );
}
