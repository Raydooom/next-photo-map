'use client';

import Image from 'next/image';
import clsx from 'clsx';

import { PhotoItem } from '@/types';

/**
 * 缩略图高度固定，宽度由照片自身的宽高比推出。
 * 只锁高度，条带的上下边缘依然齐平，而每格的宽窄如实反映横竖 ——
 * 定死宽高会把竖图裁成横的，一整条看下来分不出哪张是竖幅。
 */
const THUMB_H = 52;

/** 宽高比缺失时的回退，取最常见的 3:2 */
const FALLBACK_RATIO = 3 / 2;

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
 * 未选中的格子压淡，当前格子完全显现 —— 借的是接触印相的观感：
 * 一整条都是同一批底片，正在看的那一格才被点亮。
 * 当前项不做放大，也不套四边描边：放大会挤动邻居，描边则是又一个方框。
 *
 * 去饱和只用于暗色。亮色下缩略图本就落在浅灰台面上，再抽掉颜色、
 * 压到四成不透明，整条会淡到看不出内容；改为保留颜色、只降不透明度，
 * 靠"淡与实"而非"灰与彩"区分选中态。
 */
export function Filmstrip({
  photos,
  selectedIndex,
  emblaRef,
  onSelect
}: FilmstripProps) {
  if (photos.length <= 1) return null;

  return (
    <div className="overflow-hidden px-4 pb-5 wide:px-6" ref={emblaRef}>
      <div className="flex gap-1.5">
        {photos.map((photo, index) => {
          const isActive = index === selectedIndex;
          const ratio =
            photo.width && photo.height
              ? photo.width / photo.height
              : FALLBACK_RATIO;

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
                  : clsx(
                      'opacity-60 hover:opacity-90',
                      'dark:opacity-40 dark:grayscale',
                      'dark:hover:opacity-80 dark:hover:grayscale-0'
                    )
              )}
              style={{ height: THUMB_H, aspectRatio: ratio }}
            >
              <Image
                src={photo.thumbSmallUrl}
                alt=""
                fill
                // 覆盖横幅的最宽情形；竖幅只会更窄
                sizes="112px"
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
