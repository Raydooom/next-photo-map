'use client';

import clsx from 'clsx';

import { NumberRoll } from '@/components/ui';

interface HeroCountProps {
  totalPhotos: number;
  /** 数字滚动的起始延迟（秒） */
  delay?: number;
  className?: string;
}

/**
 * 首屏的归档量读数。
 *
 * 只给照片总数这一个数字：城市数与足迹点数在下一屏的读数网格里完整呈现，
 * 首屏再列一遍，滚动一屏就撞见同样三个数字，反而显得内容量不足。
 * 写成中文短句而不是「67 / FRAMES」的标签式，与下一屏的网格读数区分开。
 */
export function HeroCount({
  totalPhotos,
  delay = 0,
  className
}: HeroCountProps) {
  return (
    <p className={clsx('flex items-baseline gap-2.5', className)}>
      <span
        className={clsx(
          'text-[clamp(34px,4vw,44px)] leading-none tabular-nums',
          'tracking-[-0.03em] text-lab-on-media',
          "[font-variation-settings:'wght'_680]"
        )}
      >
        <NumberRoll value={totalPhotos} delay={delay} />
      </span>
      <span className="lab-body text-lab-on-media-muted">张照片</span>
    </p>
  );
}
