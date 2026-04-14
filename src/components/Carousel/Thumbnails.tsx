import React from 'react';
import clsx from 'clsx';
import Image from 'next/image';
import { ThumbnailsProps } from './types';

export const Thumbnails: React.FC<ThumbnailsProps> = ({
  slides,
  emblaRef,
  selectedIndex,
  onThumbClick
}) => {
  return (
    <div
      className="h-[100px] bg-background/80 p-2 backdrop-blur-2xl w-full overflow-hidden"
      ref={emblaRef}
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
            <Image
              className={clsx(
                'h-full w-auto transition-opacity duration-300 hover:opacity-100',
                selectedIndex === index ? 'opacity-100' : 'opacity-80'
              )}
              width={item.width ?? 0}
              height={item.height ?? 0}
              src={item.thumbSmallUrl}
              alt={item.filename}
            />
          </div>
        ))}
      </div>
    </div>
  );
};
