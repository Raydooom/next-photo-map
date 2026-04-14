import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import clsx from 'clsx';
import { ExtendInfo } from '../modules/ExifInfo';
import { PhotoItem } from '@/types';

interface ExifOverlayProps {
  isVisible: boolean;
  photo: PhotoItem;
  onClose: () => void;
}

export const ExifOverlay: React.FC<ExifOverlayProps> = ({ isVisible, photo, onClose }) => {
  return (
    <AnimatePresence>
      {isVisible && (
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
            setIsOpen={onClose}
            photo={photo}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
};
