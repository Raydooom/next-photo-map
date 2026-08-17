'use client';

import clsx from 'clsx';

import { CountUp } from '@/components/ui';

interface HeroStatsProps {
  totalPhotos: number;
  cityCount: number;
  spotCount: number;
  /** 首个数字的起始延迟（秒） */
  delay?: number;
  className?: string;
}

/** 首屏面板内的三项统计，数字逐个递增。 */
export function HeroStats({
  totalPhotos,
  cityCount,
  spotCount,
  delay = 0,
  className
}: HeroStatsProps) {
  const items = [
    { label: 'Frames', value: totalPhotos },
    { label: 'Cities', value: cityCount },
    { label: 'Spots', value: spotCount }
  ];

  return (
    <dl className={clsx('flex flex-wrap gap-x-10 gap-y-5', className)}>
      {items.map((item, index) => (
        <div key={item.label} className="min-w-16">
          <dd
            className={clsx(
              'text-2xl leading-none tabular-nums tracking-[-0.02em]',
              'text-lab-on-media',
              "[font-variation-settings:'wght'_680]"
            )}
          >
            <CountUp value={item.value} delay={delay + index * 0.12} />
          </dd>
          <dt className="lab-mono mt-2.5 text-lab-on-media-muted">
            {item.label}
          </dt>
        </div>
      ))}
    </dl>
  );
}
