'use client';

import Image from 'next/image';
import clsx from 'clsx';
import { motion, useReducedMotion } from 'motion/react';

import { PhotoItem } from '@/types';
import { edgeFadeStyle } from '@/utils/mask';

/** 默认列数。列多、单张小，才有照片量大的密度感 */
const DEFAULT_COLUMNS = 6;

/** 每列铺多少张（不足时循环取用） */
const PER_COLUMN = 6;

/**
 * 每列滚动一轮的秒数，取值互不相同使各列不同步。
 * 内容越高，同样时长下的线速度越快，故此处比短内容时取更大的值，
 * 以维持约 25-30px/s 的观感。
 */
const COLUMN_DURATIONS = [58, 71, 52, 65, 61, 68];

/**
 * 透视纵深。
 * 滚动平面绕 X 轴后倾并轻微歪斜，配合边缘淡出产生立体感；
 * scale 用于补偿倾斜后四周露出的空白，调大倾角时需同步调大。
 */
const PERSPECTIVE = '900px';
const PLANE_TRANSFORM = 'rotateX(14deg) rotateZ(-4deg) scale(1.3)';

interface TickerColumnProps {
  photos: PhotoItem[];
  duration: number;
  /** 反向滚动，与相邻列形成反差 */
  reverse?: boolean;
  isStatic?: boolean;
}

function TickerColumn({
  photos,
  duration,
  reverse = false,
  isStatic = false
}: TickerColumnProps) {
  // 铺两份相同内容：平移自身高度的一半即回到起点，因此循环无缝
  const loop = [...photos, ...photos];

  return (
    <div className="overflow-hidden">
      <motion.div
        className="flex flex-col gap-2"
        animate={
          isStatic
            ? undefined
            : { y: reverse ? ['-50%', '0%'] : ['0%', '-50%'] }
        }
        transition={{ duration, repeat: Infinity, ease: 'linear' }}
      >
        {loop.map((photo, index) => (
          <div
            key={`${photo.id}-${index}`}
            className="relative aspect-[3/4] w-full shrink-0"
          >
            <Image
              src={photo.thumbSmallUrl}
              alt=""
              fill
              sizes="(max-width: 768px) 18vw, 160px"
              className="object-cover"
            />
          </div>
        ))}
      </motion.div>
    </div>
  );
}

interface PhotoTickerProps {
  photos: PhotoItem[];
  /** 列数 */
  columns?: number;
  className?: string;
}

/**
 * 纵向滚动的照片背景。
 * 纯装饰，故整体压低透明度，并在四周做柔和渐变淡出；
 * 降低动效偏好时停止滚动，仅保留静态铺陈。
 */
export function PhotoTicker({
  photos,
  columns = DEFAULT_COLUMNS,
  className
}: PhotoTickerProps) {
  const shouldReduce = useReducedMotion();

  if (photos.length === 0) return null;

  // 每列都从全量里取，起点按列错开，使相邻列不出现相同排列
  const buckets: PhotoItem[][] = Array.from({ length: columns }, (_, col) =>
    Array.from(
      { length: PER_COLUMN },
      (_, index) => photos[(col * 2 + index) % photos.length]
    )
  );

  return (
    <div
      aria-hidden
      className={clsx(
        'pointer-events-none absolute inset-0 overflow-hidden',
        'opacity-[0.12] dark:opacity-[0.22]',
        className
      )}
      style={{ ...edgeFadeStyle, perspective: PERSPECTIVE }}
    >
      <div
        className="grid h-full gap-2"
        style={{
          gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
          transform: PLANE_TRANSFORM
        }}
      >
        {buckets.map((bucket, index) => (
          <TickerColumn
            key={index}
            photos={bucket}
            duration={COLUMN_DURATIONS[index % COLUMN_DURATIONS.length]}
            reverse={index % 2 === 1}
            isStatic={Boolean(shouldReduce)}
          />
        ))}
      </div>
    </div>
  );
}
