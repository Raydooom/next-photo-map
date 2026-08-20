'use client';

import Image from 'next/image';
import clsx from 'clsx';

import { PhotoItem } from '@/types';

/** 缩略图尺寸。定死宽高而非按原图比例，横竖混排时条带边缘才是齐的 */
const THUMB_W = 76;
const THUMB_H = 52;

interface FilmstripProps {
  photos: PhotoItem[];
  selectedIndex: number;
  /** embla 容器 ref，使条带能跟随当前项滚动 */
  emblaRef: (node: HTMLElement | null) => void;
  onSelect: (index: number) => void;
}

/**
 * 底部胶片条。
 *
 * 未选中的格子去饱和并压暗，当前格子还原成彩色 —— 借的是接触印相的观感：
 * 一整条都是同一批底片，正在看的那一格才被点亮。
 * 当前项不做放大，也不套四边描边：放大会挤动邻居，描边则是又一个方框。
 */
export function Filmstrip({
  photos,
  selectedIndex,
  emblaRef,
  onSelect
}: FilmstripProps) {
  if (photos.length <= 1) return null;

  return (
    <div className="overflow-hidden px-4 pb-5 md:px-6" ref={emblaRef}>
      <div className="flex gap-1.5">
        {photos.map((photo, index) => {
          const isActive = index === selectedIndex;

          return (
            <button
              key={photo.id}
              type="button"
              onClick={() => onSelect(index)}
              aria-label={`第 ${index + 1} 张`}
              aria-current={isActive || undefined}
              className={clsx(
                'relative shrink-0 cursor-pointer overflow-hidden',
                'transition duration-500 ease-out',
                isActive
                  ? 'opacity-100'
                  : 'opacity-40 grayscale hover:opacity-80 hover:grayscale-0'
              )}
              style={{ width: THUMB_W, height: THUMB_H }}
            >
              <Image
                src={photo.thumbSmallUrl}
                alt=""
                fill
                sizes={`${THUMB_W}px`}
                className="object-cover"
              />

              {/* 当前项的指示：底部一条强调色细线，从左侧展开 */}
              <span
                aria-hidden
                className={clsx(
                  'absolute inset-x-0 bottom-0 h-[2px] bg-lab-accent-on-media',
                  'origin-left transition-transform duration-500 ease-out',
                  isActive ? 'scale-x-100' : 'scale-x-0'
                )}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
