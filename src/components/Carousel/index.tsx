'use client';

import React, { useState, useEffect, useCallback } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { WheelGesturesPlugin } from 'embla-carousel-wheel-gestures';
import clsx from 'clsx';
import { CarouselProps } from './types';
import { MainSlider } from './MainSlider';
import { Thumbnails } from './Thumbnails';
import { Controls } from './Controls';
import { ExifOverlay } from './ExifOverlay';

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
  imageFit = 'contain',
  disableLive = false,
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
    onSelect?.(item);
  }, [
    emblaMainApi,
    emblaThumbsApi,
    slides,
    onSelect,
    showThumbnails,
    isFullScreen
  ]);

  const onThumbClick = useCallback(
    (index: number) => {
      if (!emblaMainApi || !emblaThumbsApi) return;
      if (index !== selectedIndex) {
        emblaMainApi.scrollTo(index);
      }
    },
    [emblaMainApi, emblaThumbsApi, selectedIndex]
  );

  useEffect(() => {
    if (!emblaMainApi) return;
    if (currentId !== undefined) {
      const activeIndex = slides.findIndex(item => item.id === currentId);
      if (
        activeIndex !== -1 &&
        emblaMainApi.selectedScrollSnap() !== activeIndex
      ) {
        emblaMainApi.scrollTo(activeIndex, true);
      }
    }
  }, [emblaMainApi, currentId, slides, isFullScreen]);

  useEffect(() => {
    if (!emblaMainApi) return;

    emblaMainApi.on('select', onCarouselSelect).on('reInit', onCarouselSelect);
    onCarouselSelect();

    return () => {
      emblaMainApi
        .off('select', onCarouselSelect)
        .off('reInit', onCarouselSelect);
    };
  }, [emblaMainApi, onCarouselSelect]);

  const content = (
    <section className="flex-[1_1_auto] flex flex-col relative z-1">
      <MainSlider
        slides={slides}
        emblaRef={emblaMainRef}
        imageFit={imageFit}
        disableLive={disableLive}
      />

      {showThumbnails && (
        <Thumbnails
          slides={slides}
          emblaRef={emblaThumbsRef}
          selectedIndex={selectedIndex}
          onThumbClick={onThumbClick}
        />
      )}

      {showControls && (
        <Controls
          showExif={showExif}
          isExifVisible={isExifVisible}
          onToggleExif={() => setIsExifVisible(!isExifVisible)}
          onClose={() => {
            setIsExifVisible(false);
            onClose?.();
          }}
          onPrev={() => emblaMainApi?.scrollPrev()}
          onNext={() => emblaMainApi?.scrollNext()}
        />
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
        backgroundImage:
          slides[selectedIndex] && !isFullScreen
            ? `url(${slides[selectedIndex].thumbLargeUrl})`
            : undefined
      }}
    >
      <div className="absolute inset-0 bg-black/20 z-0 backdrop-blur-2xl" />

      {content}

      {showExif && selectedIndex !== -1 && (
        <ExifOverlay
          isVisible={isExifVisible}
          photo={slides[selectedIndex]}
          onClose={() => setIsExifVisible(false)}
        />
      )}
    </aside>
  );
};

export default Carousel;
