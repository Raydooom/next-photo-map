'use client';

import Image from 'next/image';
import clsx from 'clsx';

import { PhotoItem } from '@/types';

/**
 * 缩略图高度固定，宽度由照片自身的宽高比推出。
 * 只锁高度，条带上下边缘依然齐平，而每格的宽窄如实反映横竖 ——
 * 定死宽高会把竖图裁成横的，一条看下来分不出哪张是竖幅。
 */
const THUMB_H = 44;

/** 宽高比缺失时的回退，取最常见的 3:2 */
const FALLBACK_RATIO = 3 / 2;

interface ThumbsProps {
  photos: PhotoItem[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}

/**
 * 画面区底部的缩略图条。
 *
 * 用普通的横向滚动而非轮播库：这里只需要"点一下跳过去"，
 * 照片墙那条要跟着主图的拖拽手势联动才用得上 embla，
 * 一个点位通常也就几张，挂一套轮播不划算。
 *
 * 未选中压淡、当前格完全显现，借的是接触印相的观感：
 * 一整条都是同一批底片，正在看的那一格才被点亮。
 */
export function Thumbs({ photos, selectedIndex, onSelect }: ThumbsProps) {
  if (photos.length <= 1) return null;

  return (
    <div className="no-scrollbar shrink-0 overflow-x-auto px-3 pb-3 wide:px-6 wide:pb-5">
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
                'transition duration-300 ease-out',
                'focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-lab-accent',
                isActive ? 'opacity-100' : 'opacity-45 hover:opacity-80'
              )}
              style={{ height: THUMB_H, aspectRatio: ratio }}
            >
              <Image
                src={photo.thumbSmallUrl}
                alt=""
                fill
                // 覆盖横幅的最宽情形；竖幅只会更窄
                sizes="96px"
                className="object-cover"
              />

              {/* 当前项的指示：底部一条强调色细线，从左侧展开 */}
              <span
                aria-hidden
                className={clsx(
                  'absolute inset-x-0 bottom-0 h-[2px] bg-lab-accent-solid',
                  'origin-left transition-transform duration-300 ease-out',
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
