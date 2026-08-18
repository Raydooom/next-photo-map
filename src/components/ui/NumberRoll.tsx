'use client';

import clsx from 'clsx';
import { motion, useInView, useReducedMotion } from 'motion/react';
import { useRef } from 'react';

/** 数位竖列固定十个字符 */
const DIGITS = Array.from({ length: 10 }, (_, index) => index);

/** 单个数位滚动到位的默认时长（秒） */
const DEFAULT_DURATION = 1.5;
/** 落位时的回弹幅度，0 为完全不回弹 */
const ROLL_BOUNCE = 0.2;

/** 进入视口的判定：露出六成才算读到，避免刚擦边就滚完 */
const VIEWPORT = { once: true, amount: 0.6 } as const;

/** 竖列中每个字符所占的格子。撑基线的占位字符共用它，两者字形位置才一致 */
const CELL = 'flex h-[1em] items-center justify-center';

interface DigitProps {
  digit: number;
  delay: number;
  duration: number;
  isStatic: boolean;
  /** 是否已滚到目标数字；false 时停在竖列顶端的 0 */
  rolled: boolean;
}

/**
 * 单个数位。
 * 一条 0-9 的竖列在 1em 高的窗口内滚动：窗口裁切溢出，
 * 竖列总高十倍于窗口，故位移 10% 恰好等于一个字符。
 */
function Digit({ digit, delay, duration, isStatic, rolled }: DigitProps) {
  return (
    <span className="relative inline-block w-[1ch] overflow-hidden">
      {/* 撑起窗口高度，并给窗口一条真实基线。
          竖列是绝对定位的，窗口内若没有 in-flow 内容，overflow-hidden 的
          inline-block 会拿盒子底边当基线，紧随其后的文字便整体下沉 */}
      <span aria-hidden className={clsx(CELL, 'invisible')}>
        0
      </span>

      <motion.span
        className="absolute inset-x-0 top-0 flex flex-col"
        initial={{ y: 0 }}
        animate={{ y: rolled ? `-${digit * 10}%` : 0 }}
        transition={
          isStatic
            ? { duration: 0 }
            : // 用 duration + bounce 描述弹簧，时长比调 stiffness 更直观
              { type: 'spring', duration, bounce: ROLL_BOUNCE, delay }
        }
      >
        {DIGITS.map((item) => (
          <span key={item} className={CELL}>
            {item}
          </span>
        ))}
      </motion.span>
    </span>
  );
}

interface NumberRollProps {
  /** 数字按千分位格式化；字符串原样呈现，其中的数字位参与滚动 */
  value: number | string;
  className?: string;
  /** 起始延迟（秒） */
  delay?: number;
  /** 相邻数位的错开间隔（秒） */
  stagger?: number;
  /** 单个数位滚动到位的时长（秒） */
  duration?: number;
  /** 改为进入视口才滚动。首屏之外的内容需开启，否则用户滚到时已经滚完 */
  startOnView?: boolean;
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
  duration = DEFAULT_DURATION,
  startOnView = false
}: NumberRollProps) {
  const shouldReduce = useReducedMotion();
  const formatted =
    typeof value === 'number' ? value.toLocaleString('en-US') : value;

  // 在整体容器上观察视口，而不是让各数位自己用 whileInView：
  // 数位竖列有 90% 被窗口的 overflow-hidden 裁掉，而 IntersectionObserver
  // 会把裁剪祖先算进可见比例，竖列永远达不到阈值，动画根本不会触发
  const containerRef = useRef<HTMLSpanElement>(null);
  const inView = useInView(containerRef, VIEWPORT);
  const rolled = startOnView ? inView : true;

  // 分隔符不参与滚动，故单独计数，保证错开只按数位递增
  let digitIndex = -1;

  return (
    <span
      ref={containerRef}
      className={clsx('inline-flex tabular-nums', className)}
    >
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
              rolled={rolled}
            />
          );
        })}
      </span>
    </span>
  );
}
