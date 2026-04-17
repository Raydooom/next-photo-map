import React from 'react';
import { LivePhoto } from '../common/LivePhoto';
import { MainSliderProps } from './types';

export const MainSlider: React.FC<MainSliderProps> = ({
  slides,
  emblaRef,
  imageFit = 'contain',
  disableLive = false
}) => {
  return (
    <section className="flex-[1_1_auto] h-full overflow-hidden" ref={emblaRef}>
      <div className="flex h-full">
        {slides.map(item => (
          <LivePhoto
            key={item.id}
            photoInfo={item}
            imageFit={imageFit}
            disableLive={disableLive}
          />
        ))}
      </div>
    </section>
  );
};
