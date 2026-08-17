import clsx from 'clsx';
import { ReactNode } from 'react';

interface RollingTextProps {
  children: ReactNode;
  className?: string;
}

/** 两份文案共用的位移过渡 */
const ROLL_TRANSITION =
  'transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]';

/**
 * 滚动文字。
 * 叠放两份相同文案并裁切溢出，父级 hover 时上面一份向上移出、
 * 下面一份自下跟进，形成文字翻滚替换的效果。
 *
 * 需要父级带 group/btn 标记。这里用 CSS 而非 motion 驱动：hover 状态
 * 向下传播是 CSS 原生能力，改用 motion 得把父级换成 motion 组件、
 * 还要额外包装 NextLink，成本更高而效果相同。
 *
 * 行高取 1.4 而非 1，为字母的下伸部分留出余量，否则会被裁掉；
 * 位移用 100% 因而始终与实际行高一致。
 */
export function RollingText({ children, className }: RollingTextProps) {
  return (
    <span
      className={clsx(
        'relative block overflow-hidden leading-[1.4]',
        className
      )}
    >
      <span
        className={clsx(
          'block whitespace-nowrap',
          ROLL_TRANSITION,
          'group-hover/btn:-translate-y-full',
          // 降低动效偏好时保持静止
          'motion-reduce:transition-none motion-reduce:group-hover/btn:translate-y-0'
        )}
      >
        {children}
      </span>

      {/* 第二份仅作视觉，避免屏幕阅读器重复播报 */}
      <span
        aria-hidden
        className={clsx(
          'absolute inset-0 block translate-y-full whitespace-nowrap',
          ROLL_TRANSITION,
          'group-hover/btn:translate-y-0',
          'motion-reduce:hidden'
        )}
      >
        {children}
      </span>
    </span>
  );
}
