import React, { useState, useEffect, useCallback } from 'react';
import { EmblaOptionsType } from 'embla-carousel';
import useEmblaCarousel from 'embla-carousel-react';
import { PhotoItem } from '@/types';

type PropType = {
  slides: PhotoItem[];
  options?: EmblaOptionsType;
};

const EmblaCarousel: React.FC<PropType> = props => {
  const { slides, options } = props;
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [emblaMainRef, emblaMainApi] = useEmblaCarousel(options);
  const [emblaThumbsRef, emblaThumbsApi] = useEmblaCarousel({
    containScroll: 'keepSnaps',
    dragFree: true
  });

  const onThumbClick = useCallback(
    (index: number) => {
      if (!emblaMainApi || !emblaThumbsApi) return;
      emblaMainApi.scrollTo(index);
    },
    [emblaMainApi, emblaThumbsApi]
  );

  const onSelect = useCallback(() => {
    if (!emblaMainApi || !emblaThumbsApi) return;
    setSelectedIndex(emblaMainApi.selectedScrollSnap());
    emblaThumbsApi.scrollTo(emblaMainApi.selectedScrollSnap());
  }, [emblaMainApi, emblaThumbsApi, setSelectedIndex]);

  useEffect(() => {
    if (!emblaMainApi) return;
    onSelect();

    emblaMainApi.on('select', onSelect).on('reInit', onSelect);
  }, [emblaMainApi, onSelect]);
  return (
    <div
      className="bg-cover bg-center"
      style={{
        backgroundImage: slides[selectedIndex]
          ? `url(${slides[selectedIndex].placeholder})`
          : undefined
      }}
    >
      <div className="overflow-hidden" ref={emblaMainRef}>
        <div className="flex">
          {slides.map(item => (
            <div className="flex-[0_0_100%] h-[400px] min-w-0" key={item.id}>
              <div className="embla__slide__number">{item.id}</div>
            </div>
          ))}
        </div>
      </div>

      {/* <div className="embla-thumbs">
        <div className="embla-thumbs__viewport" ref={emblaThumbsRef}>
          <div className="embla-thumbs__container">
            {slides.map((item, index) => (
              <div
                className={'embla-thumbs__slide'.concat(
                  selectedIndex === index
                    ? ' embla-thumbs__slide--selected'
                    : ''
                )}
              >
                <button
                  onClick={() => onThumbClick(index)}
                  type="button"
                  className="embla-thumbs__slide__number"
                >
                  {index + 1}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div> */}
    </div>
  );
};

export default EmblaCarousel;
