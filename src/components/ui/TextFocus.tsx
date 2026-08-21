'use client';

import { motion, useReducedMotion, type Variants } from 'motion/react';
import { Fragment } from 'react';

/** 单个词落定的时长（秒） */
const WORD_DURATION = 0.6;
/** 相邻词的错开间隔（秒） */
const WORD_STAGGER = 0.09;

/**
 * 每个词的进场：从模糊、透明、略低的位置落定。
 * 起始模糊取 10px —— 太小看不出对焦的过程，太大会糊成一团色块。
 */
const WORD_VARIANTS: Variants = {
  hidden: { opacity: 0, filter: 'blur(10px)', y: '0.18em' },
  visible: {
    opacity: 1,
    filter: 'blur(0px)',
    y: 0,
    transition: { duration: WORD_DURATION, ease: [0.16, 1, 0.3, 1] }
  }
};

interface TextFocusProps {
  text: string;
  className?: string;
  /** 起始延迟（秒） */
  delay?: number;
  /** 相邻词的错开间隔（秒） */
  stagger?: number;
}

/**
 * 逐词对焦。
 * 文本按词切开，每个词从模糊里依次显形、落定，像镜头逐段合焦。
 *
 * 相比逐字打字更适合大字号标题：44px 的字一个个蹦出来，
 * 整行会一直在抖，而按词推进只有两三次动作，稳得多。
 *
 * 完整文本另以 sr-only 输出一份，使动画期间的屏幕阅读器与爬虫
 * 仍能取到完整内容。
 */
export function TextFocus({
  text,
  className,
  delay = 0,
  stagger = WORD_STAGGER
}: TextFocusProps) {
  const shouldReduce = useReducedMotion();
  const words = text.split(' ');

  // 降低动效偏好下直接呈现终态，无需再叠一份 sr-only
  if (shouldReduce) {
    return <span className={className}>{text}</span>;
  }

  return (
    <span className={className}>
      <span className="sr-only">{text}</span>

      <motion.span
        aria-hidden
        initial="hidden"
        animate="visible"
        variants={{
          hidden: {},
          visible: { transition: { delayChildren: delay, staggerChildren: stagger } }
        }}
      >
        {words.map((word, index) => (
          <Fragment key={index}>
            {/* inline-block 让模糊与位移作用在整个词上，
                而词之间保留普通空格文本节点，换行仍照常发生 */}
            <motion.span className="inline-block" variants={WORD_VARIANTS}>
              {word}
            </motion.span>
            {index < words.length - 1 ? ' ' : null}
          </Fragment>
        ))}
      </motion.span>
    </span>
  );
}
