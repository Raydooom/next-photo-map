'use client';

import { ReactNode } from 'react';
import clsx from 'clsx';

interface IconButtonProps {
  label: string;
  onClick: () => void;
  /** 处于开启状态，用强调色表示 */
  isActive?: boolean;
  isDisabled?: boolean;
  className?: string;
  children: ReactNode;
}

/**
 * 查看器控件。
 * 常态只有图标，悬停才浮出一层淡底 —— 全屏看照片时，
 * 每个带描边的按钮都是一个抢注意力的方框。
 *
 * 暗色沿用 on-media 系令牌（压在照片/暗场上，不随主题变）；
 * 亮色改用会翻转的 lab-muted/lab-paper，因为亮色下控件是压在
 * 白底上而不是照片上，需要跟随主题令牌才能保证对比度。
 */
export function IconButton({
  label,
  onClick,
  isActive = false,
  isDisabled = false,
  className,
  children
}: IconButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isDisabled}
      aria-label={label}
      aria-pressed={isActive || undefined}
      className={clsx(
        'pointer-events-auto flex shrink-0 cursor-pointer items-center justify-center',
        'transition duration-300 ease-out',
        'hover:bg-lab-sunken dark:hover:bg-lab-on-media/10',
        'focus-visible:outline-1 focus-visible:outline-offset-2',
        'focus-visible:outline-lab-accent dark:focus-visible:outline-lab-on-media',
        isActive
          ? 'text-lab-accent dark:text-lab-accent-on-media'
          : clsx(
              'text-lab-muted hover:text-lab-paper',
              'dark:text-lab-on-media-muted dark:hover:text-lab-on-media'
            ),
        'disabled:pointer-events-none disabled:opacity-20',
        className
      )}
    >
      {children}
    </button>
  );
}
