'use client';

import clsx from 'clsx';
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform
} from 'motion/react';
import { useEffect, useState } from 'react';

interface TypewriterProps {
  text: string;
  className?: string;
  /** 单个字符的耗时（秒） */
  speed?: number;
  /** 起始延迟（秒） */
  delay?: number;
  /** 打字过程中是否显示光标 */
  cursor?: boolean;
}

/**
 * 打字机效果。
 * 逐字显示文本，完整文本另以 sr-only 输出一份，
 * 使动画期间的屏幕阅读器与爬虫仍能取到完整内容。
 */
export function Typewriter({
  text,
  className,
  speed = 0.045,
  delay = 0,
  cursor = false
}: TypewriterProps) {
  const shouldReduce = useReducedMotion();
  const count = useMotionValue(0);
  const visible = useTransform(count, (latest) =>
    text.slice(0, Math.round(latest))
  );
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    // 降低动效偏好下直接呈现终态
    if (shouldReduce) {
      count.set(text.length);
      setIsDone(true);
      return;
    }

    setIsDone(false);
    count.set(0);

    const controls = animate(count, text.length, {
      duration: text.length * speed,
      ease: 'linear',
      delay,
      onComplete: () => setIsDone(true)
    });

    return () => controls.stop();
  }, [text, speed, delay, shouldReduce, count]);

  return (
    <span className={className}>
      <span className="sr-only">{text}</span>
      <motion.span aria-hidden>{visible}</motion.span>
      {cursor && !isDone && (
        <span
          aria-hidden
          className={clsx(
            'ml-1 inline-block h-[0.82em] w-[0.055em] align-middle',
            'animate-pulse bg-current'
          )}
        />
      )}
    </span>
  );
}
