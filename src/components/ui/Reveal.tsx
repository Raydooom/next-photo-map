'use client';

import { motion, useReducedMotion, type Variants } from 'motion/react';
import { ReactNode } from 'react';

const SPRING = { type: 'spring', stiffness: 260, damping: 30 } as const;
const VIEWPORT = { once: true, amount: 0.15 } as const;

interface RevealProps {
  children: ReactNode;
  className?: string;
  /** 延迟秒数 */
  delay?: number;
}

/** 单个元素的滚动进场：淡入并上移，spring 收尾。 */
export function Reveal({ children, className, delay = 0 }: RevealProps) {
  const shouldReduce = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={shouldReduce ? { opacity: 0 } : { opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={VIEWPORT}
      transition={{ ...SPRING, delay }}
    >
      {children}
    </motion.div>
  );
}

interface RevealGroupProps {
  children: ReactNode;
  className?: string;
  /** 子元素之间的间隔秒数 */
  stagger?: number;
}

/**
 * 分批进场的容器。
 * 子元素需为 RevealItem，其动画状态由本容器统一驱动。
 */
export function RevealGroup({
  children,
  className,
  stagger = 0.08
}: RevealGroupProps) {
  const variants: Variants = {
    hidden: {},
    visible: { transition: { staggerChildren: stagger } }
  };

  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={VIEWPORT}
      variants={variants}
    >
      {children}
    </motion.div>
  );
}

/** RevealGroup 的子项。 */
export function RevealItem({
  children,
  className
}: {
  children: ReactNode;
  className?: string;
}) {
  const shouldReduce = useReducedMotion();

  const variants: Variants = {
    hidden: shouldReduce ? { opacity: 0 } : { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: SPRING }
  };

  return (
    <motion.div className={className} variants={variants}>
      {children}
    </motion.div>
  );
}
