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
        'flex min-w-0 flex-col justify-between gap-6',
        'px-5 py-6 md:px-6 md:py-8',
        className
      )}
    >
      <span className="lab-mono text-lab-accent">{index}</span>

      <div className="min-w-0">
        <p
          className={clsx(
            'text-[clamp(28px,3.4vw,40px)] leading-none tabular-nums',
            'tracking-[-0.03em] text-lab-paper',
            "[font-variation-settings:'wght'_660]"
          )}
        >
          {value}
        </p>
        <p className="lab-mono mt-3 text-lab-muted">{label}</p>
        {hint && <p className="mt-1 text-xs text-lab-faint">{hint}</p>}
      </div>
    </div>
  );
}
