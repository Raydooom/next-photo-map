'use client';

import clsx from 'clsx';
import { motion, useReducedMotion } from 'motion/react';

/** 数位竖列固定十个字符 */
const DIGITS = Array.from({ length: 10 }, (_, index) => index);

/** 单个数位滚动到位的默认时长（秒） */
const DEFAULT_DURATION = 1.5;
/** 落位时的回弹幅度，0 为完全不回弹 */
const ROLL_BOUNCE = 0.2;

interface DigitProps {
  digit: number;
  delay: number;
  duration: number;
  isStatic: boolean;
}

/**
 * 单个数位。
 * 一条 0-9 的竖列在 1em 高的窗口内滚动：窗口裁切溢出，
 * 竖列总高十倍于窗口，故位移 10% 恰好等于一个字符。
 */
function Digit({ digit, delay, duration, isStatic }: DigitProps) {
  return (
    <span className="relative inline-block h-[1em] w-[1ch] overflow-hidden">
      <motion.span
        className="absolute inset-x-0 top-0 flex flex-col"
        initial={{ y: 0 }}
        animate={{ y: `-${digit * 10}%` }}
        transition={
          isStatic
            ? { duration: 0 }
            : // 用 duration + bounce 描述弹簧，时长比调 stiffness 更直观
              { type: 'spring', duration, bounce: ROLL_BOUNCE, delay }
        }
      >
        {DIGITS.map((item) => (
          <span key={item} className="flex h-[1em] items-center justify-center">
            {item}
          </span>
        ))}
      </motion.span>
    </span>
  );
}

interface NumberRollProps {
  value: number;
  className?: string;
  /** 起始延迟（秒） */
  delay?: number;
  /** 相邻数位的错开间隔（秒） */
  stagger?: number;
  /** 单个数位滚动到位的时长（秒） */
  duration?: number;
}

/**
 * 数位滚动。
 * 每一位从 0 滚到目标数字，位与位之间错开，读起来像仪表盘依次归位。
 * 与逐帧累加数值的做法不同，这里位数从一开始就是最终宽度，因此不会有
 * 数值变宽导致的布局跳动。
 */
export function NumberRoll({
  value,
  className,
  delay = 0,
  stagger = 0.09,
  duration = DEFAULT_DURATION
}: NumberRollProps) {
  const shouldReduce = useReducedMotion();
  const formatted = value.toLocaleString('en-US');

  // 分隔符不参与滚动，故单独计数，保证错开只按数位递增
  let digitIndex = -1;

  return (
    <span className={clsx('inline-flex tabular-nums', className)}>
      {/* 数位竖列对屏幕阅读器是一串无意义的 0-9，故另给一份纯文本 */}
      <span className="sr-only">{formatted}</span>

      <span aria-hidden className="inline-flex">
        {formatted.split('').map((char, index) => {
          if (!/\d/.test(char)) {
            return <span key={index}>{char}</span>;
          }

          digitIndex += 1;

          return (
            <Digit
              key={index}
              digit={Number(char)}
              delay={delay + digitIndex * stagger}
              duration={duration}
              isStatic={Boolean(shouldReduce)}
            />
          );
        })}
      </span>
    </span>
  );
}
