'use client';

import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform
} from 'motion/react';
import { useEffect } from 'react';

interface CountUpProps {
  value: number;
  className?: string;
  /** 增长耗时（秒） */
  duration?: number;
  /** 起始延迟（秒） */
  delay?: number;
}

/**
 * 数字增长动画。
 * 从 0 递增到目标值，缓动末段减速。
 * 建议在外层配合 tabular-nums，避免位数变化引起的宽度抖动。
 */
export function CountUp({
  value,
  className,
  duration = 2.5,
  delay = 0
}: CountUpProps) {
  const shouldReduce = useReducedMotion();
  const count = useMotionValue(0);
  const display = useTransform(count, (latest) =>
    Math.round(latest).toLocaleString('en-US')
  );

  useEffect(() => {
    // 降低动效偏好下直接呈现终值
    if (shouldReduce) {
      count.set(value);
      return;
    }

    const controls = animate(count, value, {
      duration,
      delay,
      ease: [0.16, 1, 0.3, 1]
    });

    return () => controls.stop();
  }, [value, duration, delay, shouldReduce, count]);

  return <motion.span className={className}>{display}</motion.span>;
}
