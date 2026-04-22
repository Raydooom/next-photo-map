import React from 'react';
import clsx from 'clsx';
import { IndicatorsProps } from './types';

export const Indicators: React.FC<IndicatorsProps> = ({
  count,
  selectedIndex,
  onIndicatorClick,
  className
}) => {
  if (count === 0) return null;

  return (
    <div className={clsx('flex items-center gap-2', className)}>
      {Array.from({ length: count }).map((_, index) => (
        <button
          key={index}
          type="button"
          onClick={() => onIndicatorClick?.(index)}
          className={clsx(
            'h-2 rounded-full transition-all duration-300 ease-out',
            'hover:scale-125 active:scale-90',
            'hover:shadow-lg hover:shadow-white/30',
            'active:shadow-md active:shadow-white/20',
            'cursor-pointer',
            selectedIndex === index
              ? 'w-6 bg-white shadow-button'
              : 'w-2 bg-white/70 hover:bg-white hover:shadow-white/40'
          )}
          aria-label={`Go to slide ${index + 1}`}
        />
      ))}
    </div>
  );
};
