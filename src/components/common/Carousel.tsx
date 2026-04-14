'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { EmblaOptionsType, EmblaPluginType } from 'embla-carousel';
import useEmblaCarousel from 'embla-carousel-react';
import { WheelGesturesPlugin } from 'embla-carousel-wheel-gestures';
import { PhotoItem } from '@/types';
import clsx from 'clsx';
import { CloseIcon, InfoIcon, LeftIcon, RightIcon } from '../Icons/button';
import { ExtendInfo } from '../modules/ExifInfo';
import { AnimatePresence, motion } from 'framer-motion';
import { SlideItem } from './SlideItem';
import { replaceUrl } from '@/utils/history';

export type CarouselProps = {
  slides: PhotoItem[];
  options?: EmblaOptionsType;
  plugins?: EmblaPluginType[];
  currentId: number | undefined;
  onSelect?: (id: number) => void;
  onClose?: () => void;
  showThumbnails?: boolean;
  showControls?: boolean;
  showExif?: boolean;
  isFullScreen?: boolean;
  imageFit?: 'contain' | 'cover'; // 新增 imageFit 属性
  className?: string;
};

const Carousel: React.FC<CarouselProps> = ({
  slides,
  options,
  plugins = [],
  currentId,
  onSelect,
  onClose,
  showThumbnails = false,
  showControls = false,
  showExif = false,
  isFullScreen = false,
  imageFit = 'contain', // 默认使用 contain，保持原有大图预览的比例
  className
}) => {
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [emblaMainRef, emblaMainApi] = useEmblaCarousel(options, plugins);
  const [emblaThumbsRef, emblaThumbsApi] = useEmblaCarousel(
    {
      containScroll: 'keepSnaps',
      dragFree: true
    },
    [WheelGesturesPlugin({ forceWheelAxis: 'y' })]
  );

  const [isExifVisible, setIsExifVisible] = useState(false);

  const onCarouselSelect = useCallback(() => {
    if (!emblaMainApi) return;
    const newIndex = emblaMainApi.selectedScrollSnap();
    setSelectedIndex(newIndex);
    if (showThumbnails && emblaThumbsApi) {
      emblaThumbsApi.scrollTo(newIndex);
    }

    // 更新 URL 中的 photoId 参数
    const item = slides[newIndex];
    if (item) {
      if (onSelect) {
        onSelect(item.id);
      } else {
        replaceUrl(`${window.location.pathname}?photoId=${item.id}`);
      }
    }
  }, [emblaMainApi, emblaThumbsApi, slides, onSelect, showThumbnails]);

  const onThumbClick = useCallback(
    (index: number) => {
      if (!emblaMainApi || !emblaThumbsApi) return;
      // 确保点击不同的缩略图
      if (index !== selectedIndex) {
        emblaMainApi.scrollTo(index);
      }
    },
    [emblaMainApi, emblaThumbsApi, selectedIndex]
  );

  useEffect(() => {
    if (!emblaMainApi) return;
    // 初始化或 currentId 改变时同步位置
    if (currentId !== undefined) {
      const activeIndex = slides.findIndex(item => item.id === currentId);
      if (
        activeIndex !== -1 &&
        emblaMainApi.selectedScrollSnap() !== activeIndex
      ) {
        emblaMainApi.scrollTo(activeIndex, true);
      }
    }
  }, [emblaMainApi, currentId, slides]);

  useEffect(() => {
    if (!emblaMainApi) return;

    emblaMainApi.on('select', onCarouselSelect).on('reInit', onCarouselSelect);
    // 初始执行一次同步状态
    onCarouselSelect();

    return () => {
      emblaMainApi
        .off('select', onCarouselSelect)
        .off('reInit', onCarouselSelect);
    };
  }, [emblaMainApi, onCarouselSelect]);

  const content = (
    <section className="flex-[1_1_auto] flex flex-col relative z-1">
      <section
        className=" flex-[1_1_auto] h-full overflow-hidden"
        ref={emblaMainRef}
      >
        <div className="flex h-full">
          {slides.map(item => (
            <SlideItem key={item.id} item={item} imageFit={imageFit} />
          ))}
        </div>
      </section>

      {/* 缩略图 */}
      {showThumbnails && (
        <div
          className="h-[100px] bg-background/20 p-2 backdrop-blur-2xl w-full overflow-hidden"
          ref={emblaThumbsRef}
        >
          <div className="h-full flex flex-no-wrap gap-1">
            {slides.map((item, index) => (
              <div
                key={item.id}
                className={clsx(
                  'h-full flex-[0_0_auto] rounded-sm overflow-hidden cursor-pointer transition-all bg-black',
                  selectedIndex === index ? 'mx-2 scale-110' : 'mx-0'
                )}
                onClick={() => onThumbClick(index)}
              >
                <img
                  className={clsx(
                    'h-full w-auto transition-opacity duration-300 hover:opacity-100',
                    selectedIndex === index ? 'opacity-100' : 'opacity-80'
                  )}
                  width={item.width}
                  height={item.height}
                  src={item.thumbLargeUrl}
                  alt={item.filename}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 操作栏 */}
      {showControls && (
        <div className="absolute top-5 right-5 z-10 flex gap-4">
          {showExif && (
            <InfoIcon onClick={() => setIsExifVisible(!isExifVisible)} />
          )}
          {onClose && (
            <CloseIcon
              onClick={() => {
                setIsExifVisible(false);
                onClose();
              }}
            />
          )}
        </div>
      )}

      {/* 左右切换按钮 */}
      {showControls && (
        <div className="absolute bottom-24 right-5 z-10 flex gap-2">
          <LeftIcon onClick={() => emblaMainApi?.scrollPrev()} />
          <RightIcon onClick={() => emblaMainApi?.scrollNext()} />
        </div>
      )}
    </section>
  );

  if (!isFullScreen) {
    return (
      <div
        className={clsx(
          'relative h-full w-full flex overflow-hidden',
          className
        )}
      >
        {content}
      </div>
    );
  }

  return (
    <aside
      className={clsx(
        'bg-cover bg-center h-full w-full flex relative overflow-hidden',
        className
      )}
      style={{
        backgroundImage: slides[selectedIndex]
          ? `url(${slides[selectedIndex].thumbLargeUrl})`
          : undefined
      }}
    >
      {/* 背景亮度遮罩 */}
      <div className="absolute inset-0 bg-black/20 z-0 backdrop-blur-2xl" />

      {content}

      <AnimatePresence>
        {isExifVisible && selectedIndex !== -1 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{
              opacity: 0,
              y: 20,
              transition: { duration: 0.2, ease: 'easeInOut' }
            }}
            className={clsx('absolute top-17 right-5 z-10')}
          >
            <ExtendInfo
              setIsOpen={setIsExifVisible}
              photo={slides[selectedIndex]}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </aside>
  );
};

export default Carousel;
