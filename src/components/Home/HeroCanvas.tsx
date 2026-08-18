'use client';

import { useCallback, useMemo, useState } from 'react';
import Autoplay, { type AutoplayType } from 'embla-carousel-autoplay';
import Fade from 'embla-carousel-fade';
import type { EmblaCarouselType } from 'embla-carousel';
import { motion, useReducedMotion } from 'motion/react';

import Carousel from '@/components/Carousel';
import { PhotoItem } from '@/types';
import { HeroPanel } from './HeroPanel';
import { HeroReadout } from './HeroReadout';
import { HeroExif } from './HeroExif';

interface HeroCanvasProps {
  /** 精选照片，作为背景轮播 */
  photos: PhotoItem[];
  /** 照片总数 */
  totalPhotos: number;
}

/**
 * 首屏。
 * 照片铺满背景，文案压在左侧的半透明黑面板内；面板叠加模糊，
 * 与底层的浅色遮罩一起把背景压到足以保证文字对比度的程度。
 */
export function HeroCanvas({ photos, totalPhotos }: HeroCanvasProps) {
  // 以首张为初始值，使服务端渲染即有读数内容，避免首屏跳动
  const [current, setCurrent] = useState<PhotoItem | null>(photos[0] ?? null);
  const [api, setApi] = useState<EmblaCarouselType>();
  const shouldReduce = useReducedMotion();

  /**
   * 手动翻页。
   * 一旦手动切换就停掉自动轮播：用户已经表达了自己看的意图，
   * 再过几秒自动跳走会把他正在看的那张抢掉。
   */
  const scroll = useCallback(
    (direction: 'prev' | 'next') => {
      if (!api) return;

      (api.plugins().autoplay as AutoplayType | undefined)?.stop();

      if (direction === 'prev') {
        api.scrollPrev();
      } else {
        api.scrollNext();
      }
    },
    [api]
  );

  // 降低动效偏好下不自动轮播
  const plugins = useMemo(
    () =>
      shouldReduce
        ? []
        : [Autoplay({ delay: 5600, stopOnInteraction: false }), Fade()],
    [shouldReduce]
  );

  // 轮播首次回调前 current 为空，此时按首张计数，避免首帧出现 00
  const currentIndex = current
    ? photos.findIndex((item) => item.id === current.id) + 1
    : Math.min(1, photos.length);

  return (
    <section className="relative isolate flex min-h-[620px] flex-col overflow-hidden border-b border-lab-line md:min-h-[680px]">
      {/* 背景轮播 */}
      <div className="absolute inset-0 z-0">
        <Carousel
          slides={photos}
          options={{ loop: true, duration: 100 }}
          plugins={plugins}
          imageFit="cover"
          disableLive
          className="h-full w-full"
          onApi={setApi}
          onSelect={setCurrent}
        />
      </div>

      {/* 统一照片明度，文字可读性由黑色面板保证，故只需很浅的一层 */}
      <div aria-hidden className="absolute inset-0 z-[1] bg-black/25" />

      <div className="relative z-[2] flex flex-1 flex-col">
        {/* 信息面板 */}
        <div className="lab-shell flex flex-1 items-center py-12 md:py-16">
          <HeroPanel
            currentIndex={currentIndex}
            totalSlides={photos.length}
            totalPhotos={totalPhotos}
            onPrev={() => scroll('prev')}
            onNext={() => scroll('next')}
          />
        </div>

        {/* 底部通栏读数条：左侧地点与标签，右侧拍摄参数 */}
        <motion.div
          className="border-t border-lab-on-media/20 bg-black/55 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 1.5 }}
        >
          {/* key 随照片变化，使轮播切换时读数跟着淡入，而不是硬跳 */}
          <motion.div
            key={current?.id ?? 'empty'}
            // 固定最小高度：读数在缺少地点/标签/EXIF 时会整块不渲染，
            // 不给下限的话条会塌成细带，轮播切换时高度还会来回跳
            className="lab-shell flex h-12 flex-wrap items-center justify-between gap-x-8 gap-y-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: shouldReduce ? 0 : 0.4 }}
          >
            <HeroReadout photo={current} />
            <HeroExif photo={current} />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
