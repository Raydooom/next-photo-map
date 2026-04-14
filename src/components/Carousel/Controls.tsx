import React from 'react';
import { CloseIcon, InfoIcon, LeftIcon, RightIcon } from '../Icons/button';
import { ControlsProps } from './types';

export const Controls: React.FC<ControlsProps> = ({
  showExif,
  isExifVisible,
  onToggleExif,
  onClose,
  onPrev,
  onNext
}) => {
  return (
    <>
      <div className="absolute top-5 right-5 z-10 flex gap-4">
        {showExif && (
          <InfoIcon onClick={onToggleExif} />
        )}
        {onClose && (
          <CloseIcon
            onClick={onClose}
          />
        )}
      </div>

      <div className="absolute bottom-24 right-5 z-10 flex gap-2">
        <LeftIcon onClick={onPrev} />
        <RightIcon onClick={onNext} />
      </div>
    </>
  );
};
