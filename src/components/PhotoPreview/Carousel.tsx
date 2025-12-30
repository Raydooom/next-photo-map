import React, { useState, useEffect, useCallback } from 'react';
import { EmblaOptionsType } from 'embla-carousel';
import useEmblaCarousel from 'embla-carousel-react';
import { WheelGesturesPlugin } from 'embla-carousel-wheel-gestures';
import { PhotoItem } from '@/types';
import clsx from 'clsx';
import { CloseIcon, InfoIcon, LeftIcon, RightIcon } from '../Icons/button';
import { ExifInfo } from '../modules/ExifInfo';
import { AnimatePresence, motion } from 'framer-motion';
import { SlideItem } from './SlideItem';

type PropType = {
  slides: PhotoItem[];
  options?: EmblaOptionsType;
  currentPreview?: PhotoItem;
  currentIndex: number;
};

const EmblaCarousel: React.FC<PropType & { onClose: () => void }> = props => {
  const { slides, options, currentPreview, currentIndex, onClose } = props;
  const [selectedIndex, setSelectedIndex] = useState(currentIndex);
  const [emblaMainRef, emblaMainApi] = useEmblaCarousel(options);
  const [emblaThumbsRef, emblaThumbsApi] = useEmblaCarousel(
    {
      containScroll: 'keepSnaps',
      dragFree: true
    },
    [WheelGesturesPlugin({ forceWheelAxis: 'y' })]
  );

  // 当current变化时，更新选中索引（仅在非用户操作时）
  useEffect(() => {
    if (!slides.length || !emblaMainApi) return;

    if (currentIndex !== selectedIndex) {
      // 使用setTimeout确保在用户操作后不会立即覆盖
      setTimeout(() => {
        if (emblaMainApi.selectedScrollSnap() !== currentIndex) {
          emblaMainApi.scrollTo(currentIndex);
        }
      }, 0);
    }
  }, [currentIndex, emblaMainApi]);

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

  const onSelect = useCallback(() => {
    if (!emblaMainApi || !emblaThumbsApi) return;
    const newIndex = emblaMainApi.selectedScrollSnap();
    setSelectedIndex(newIndex);
    emblaThumbsApi.scrollTo(newIndex);
  }, [emblaMainApi, emblaThumbsApi]);

  useEffect(() => {
    if (!emblaMainApi) return;

    // 初始化时设置选中状态
    setSelectedIndex(currentIndex);

    // 设置事件监听
    onSelect();
    emblaMainApi.on('select', onSelect).on('reInit', onSelect);
  }, [emblaMainApi, onSelect]);

  // 初始化完成后滚动到指定位置
  useEffect(() => {
    if (!emblaMainApi || !slides.length) return;

    if (currentIndex !== -1) {
      emblaMainApi.scrollTo(currentIndex, true);
    }
  }, [emblaMainApi, slides, currentIndex]);

  const [showExif, setShowExif] = useState(false);

  const [activeSlide, setActiveSlide] = useState<PhotoItem | undefined>(
    currentPreview
  );
  useEffect(() => {
    setActiveSlide(slides[selectedIndex]);
  }, [selectedIndex, slides]);

  return (
    <aside
      className="bg-cover bg-center h-full w-full flex relative"
      style={{
        backgroundImage: slides[selectedIndex]
          ? `url(${slides[selectedIndex].placeholder})`
          : undefined
      }}
    >
      {/* 背景亮度遮罩 */}
      <div className="absolute inset-0 bg-black/20 z-0 backdrop-blur-2xl" />

      <section className="flex-[1_1_auto] flex flex-col relative z-1">
        <section
          className=" flex-[1_1_auto] h-full overflow-hidden"
          ref={emblaMainRef}
        >
          <div className="flex h-full">
            {slides.map(item => (
              <SlideItem key={item.id} item={item} />
            ))}
          </div>
        </section>
        {/* 缩略图 */}
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
                  src={item.url}
                  alt={item.name}
                />
              </div>
            ))}
          </div>
        </div>
        {/* 操作栏 */}
        <div className="absolute top-5 right-5 z-10 flex gap-4">
          <InfoIcon onClick={() => setShowExif(!showExif)} />
          <CloseIcon
            onClick={() => {
              setShowExif(false);
              onClose();
            }}
          />
        </div>
        {/* 左右切换按钮 */}
        <div className="absolute bottom-24 right-5 z-10 flex gap-2">
          <LeftIcon onClick={() => emblaMainApi?.scrollPrev()} />
          <RightIcon onClick={() => emblaMainApi?.scrollNext()} />
        </div>
      </section>
      <AnimatePresence>
        {showExif && activeSlide && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{
              opacity: 0,
              y: 20,
              transition: { duration: 0.2, ease: 'easeInOut' }
            }}
            className={clsx('absolute top-16 right-5 z-10')}
          >
            <ExifInfo setIsOpen={setShowExif} photo={activeSlide} />
          </motion.div>
        )}
      </AnimatePresence>
    </aside>
  );
};

export default EmblaCarousel;
