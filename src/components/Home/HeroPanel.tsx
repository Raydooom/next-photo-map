'use client';

import { ReactNode } from 'react';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';

import { Eyebrow, LabButton, Typewriter } from '@/components/ui';
import { HeroStats } from './HeroStats';

/**
 * 进场时间线（秒）。
 * 打字与数字增长并行推进，整条时间线控制在 1.5s 内收尾。
 */
const T = {
  eyebrow: 0.12,
  titleLine1: 0.22,
  titleLine2: 0.7,
  description: 0.95,
  stats: 1.1,
  actions: 1.35
};

/** 淡入上移，用于面板内各内容块 */
function FadeUp({
  children,
  delay,
  className
}: {
  children: ReactNode;
  delay: number;
  className?: string;
}) {
  const shouldReduce = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={shouldReduce ? { opacity: 0 } : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

interface HeroPanelProps {
  /** 当前轮播项序号，从 1 开始 */
  currentIndex: number;
  totalSlides: number;
  totalPhotos: number;
  cityCount: number;
  spotCount: number;
}

/**
 * 首屏信息面板。
 * 半透明黑底叠加模糊，内部颜色一律取 on-media 令牌，不随亮暗主题翻转。
 */
export function HeroPanel({
  currentIndex,
  totalSlides,
  totalPhotos,
  cityCount,
  spotCount
}: HeroPanelProps) {
  return (
    <motion.div
      className="w-full max-w-[440px] border border-lab-on-media/15 bg-black/65 px-7 py-8 backdrop-blur-xl md:px-9 md:py-10"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 200, damping: 26 }}
    >
      <FadeUp
        delay={T.eyebrow}
        className="flex items-center justify-between gap-4"
      >
        <Eyebrow className="text-lab-on-media-muted">Photo archive</Eyebrow>
        <Eyebrow className="tabular-nums text-lab-on-media-muted">
          {String(currentIndex).padStart(2, '0')} /{' '}
          {String(totalSlides).padStart(2, '0')}
        </Eyebrow>
      </FadeUp>

      {/* min-h 预留两行高度，避免逐字打出时容器高度跳动 */}
      <h1 className="lab-title mt-7 min-h-[2.1em] text-lab-on-media">
        <Typewriter
          text="Every frame"
          className="block"
          delay={T.titleLine1}
          cursor
        />
        <Typewriter
          text="has a place."
          className="block text-lab-accent-on-media"
          delay={T.titleLine2}
          cursor
        />
      </h1>

      <FadeUp delay={T.description} className="mt-5">
        <p className="lab-body text-lab-on-media-muted">
          每张照片都带着按下快门时的坐标，这里是一份持续生长的光影档案。
        </p>
      </FadeUp>

      <FadeUp delay={T.stats} className="mt-8">
        <HeroStats
          totalPhotos={totalPhotos}
          cityCount={cityCount}
          spotCount={spotCount}
          delay={T.stats}
        />
      </FadeUp>

      <FadeUp
        delay={T.actions}
        className="mt-9 flex flex-wrap items-center gap-3"
      >
        <LabButton
          href="/photos"
          variant="primary"
          endContent={
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover/btn:translate-x-0.5" />
          }
        >
          浏览照片墙
        </LabButton>
        <LabButton
          href="/footprint"
          className="border-lab-on-media/40 text-lab-on-media hover:border-lab-on-media hover:text-lab-on-media"
          endContent={<ArrowUpRight className="h-3.5 w-3.5" />}
        >
          足迹地图
        </LabButton>
      </FadeUp>
    </motion.div>
  );
}
