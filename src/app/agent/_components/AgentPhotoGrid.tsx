'use client';

import Image from 'next/image';
import { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { PhotoPreview } from '@/components/photo/PhotoPreview';
import type { PhotoItem } from '@/lib/types/photo';

interface AgentPhotoGridProps {
  photos: PhotoItem[];
  total: number;
  animate?: boolean;
}

function getGridClass(photoCount: number) {
  if (photoCount === 1) return 'grid-cols-1 w-40 sm:w-44';
  if (photoCount === 2 || photoCount === 4) {
    return 'grid-cols-2 w-full max-w-[321px]';
  }
  return 'grid-cols-3 w-full max-w-md';
}

/**
 * 检索结果采用自适应社交式图片组：1 张单列、2/4 张双列、3 或 5–9 张三列。
 * 背景只属于实际图片单元，未占用的网格轨道保持页面底色，不会形成灰色空白格。
 */
export function AgentPhotoGrid({
  photos,
  total,
  animate = false
}: AgentPhotoGridProps) {
  const [previewId, setPreviewId] = useState<number>();
  const shouldReduceMotion = useReducedMotion();
  const shouldAnimate = animate && !shouldReduceMotion;
  const visiblePhotos = photos.slice(0, 9);
  const hiddenCount = Math.max(photos.length - visiblePhotos.length, 0);

  if (visiblePhotos.length === 0) return null;

  return (
    <motion.section
      className="mt-5"
      initial={shouldAnimate ? { opacity: 0, y: 12 } : false}
      animate={shouldAnimate ? { opacity: 1, y: 0 } : undefined}
      transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="mb-2 flex items-baseline gap-2">
        <span className="lab-action text-lab-paper">相关照片</span>
        <span className="text-[12px] text-lab-muted">
          找到 {total} 张相关照片
          {hiddenCount > 0 && ` · 展示前 ${visiblePhotos.length} 张`}
        </span>
      </div>

      <div className={`inline-grid gap-1 ${getGridClass(visiblePhotos.length)}`}>
        {visiblePhotos.map((photo, index) => {
          const showMore = index === visiblePhotos.length - 1 && hiddenCount > 0;

          return (
            <button
              key={photo.id}
              type="button"
              aria-label={`查看照片 ${photo.filename}`}
              onClick={() => setPreviewId(photo.id)}
              className="group/photo relative aspect-square cursor-pointer overflow-hidden bg-lab-sunken focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lab-accent"
            >
              <Image
                src={photo.thumbLargeUrl}
                alt={photo.filename}
                fill
                quality={88}
                sizes="(max-width: 768px) 29vw, 176px"
                className="object-cover transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/photo:scale-105"
              />
              {showMore && (
                <span className="absolute inset-0 flex items-center justify-center bg-black/60 text-lg text-white">
                  +{hiddenCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <p className="mt-2 text-[11px] text-lab-faint">点击图片查看详情</p>

      <PhotoPreview
        list={photos}
        previewId={previewId}
        isOpen={previewId !== undefined}
        onClose={() => setPreviewId(undefined)}
      />
    </motion.section>
  );
}
