import React, { useState, useEffect, useCallback } from 'react';
import { EmblaOptionsType } from 'embla-carousel';
import useEmblaCarousel from 'embla-carousel-react';
import { WheelGesturesPlugin } from 'embla-carousel-wheel-gestures';
import { PhotoItem } from '@/types';
import clsx from 'clsx';
import { CloseIcon, InfoIcon, LeftIcon, RightIcon } from '../Icons/button';
import { ExtendInfo } from '../modules/ExifInfo';
import { AnimatePresence, motion } from 'framer-motion';
import { useSearchParams } from 'next/navigation';
import { SlideItem } from './SlideItem';

type PropType = {
  slides: PhotoItem[];
  options?: EmblaOptionsType;
};

const EmblaCarousel: React.FC<PropType & { onClose: () => void }> = props => {
  const { slides, options, onClose } = props;
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [emblaMainRef, emblaMainApi] = useEmblaCarousel(options);
  const [emblaThumbsRef, emblaThumbsApi] = useEmblaCarousel(
    {
      containScroll: 'keepSnaps',
      dragFree: true
    },
    [WheelGesturesPlugin({ forceWheelAxis: 'y' })]
  );
  const searchParams = useSearchParams();
  const photoId = searchParams.get('photoId');
  console.log('photoId', photoId);
  useEffect(() => {
    if (!emblaMainApi) return;
    // 初始化时设置选中状态
    if (photoId) {
      const activeIndex = slides.findIndex(item => item.id === Number(photoId));
      console.log('activeIndex', activeIndex, photoId);
      if (activeIndex !== -1) {
        setSelectedIndex(activeIndex);
        // 设置事件监听
        setTimeout(() => {
          if (emblaMainApi.selectedScrollSnap() !== activeIndex) {
            emblaMainApi.scrollTo(activeIndex, true);
          }
          onSelect();
          emblaMainApi.on('select', onSelect).on('reInit', onSelect);
        }, 0);
      }
    }
  }, [emblaMainApi, photoId, slides]);

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

  const [showExif, setShowExif] = useState(false);
  const [activeSlide, setActiveSlide] = useState<PhotoItem | undefined>();
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
            className={clsx('absolute top-17 right-5 z-10')}
          >
            <ExtendInfo setIsOpen={setShowExif} photo={activeSlide} />
          </motion.div>
        )}
      </AnimatePresence>
    </aside>
  );
};

export default EmblaCarousel;
