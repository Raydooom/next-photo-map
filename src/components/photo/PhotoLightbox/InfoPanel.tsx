'use client';

import { X } from 'lucide-react';
import clsx from 'clsx';

import { PhotoItem } from '@/lib/types';
import {
  PhotoMetaHeader,
  PhotoMetaSections
} from '@/components/photo/PhotoMetaSections';
import { IconButton } from './IconButton';

interface InfoPanelProps {
  photo: PhotoItem;
  onClose: () => void;
}

/** 轮播查看器的浮动信息外壳：固定身份头 + 可滚动统一信息内容。 */
export function InfoPanel({ photo, onClose }: InfoPanelProps) {
  return (
    <div
      className={clsx(
        'pointer-events-auto ml-auto mr-4 w-[min(360px,calc(100vw-2rem))] wide:mr-6',
        'flex max-h-[min(60dvh,560px)] flex-col overflow-hidden',
        'bg-lab-raised',
        'shadow-[0_4px_12px_-4px_rgba(0,0,0,0.08),0_18px_44px_-12px_rgba(0,0,0,0.18),0_36px_80px_-28px_rgba(0,0,0,0.14)]',
        'dark:shadow-[0_18px_44px_-12px_rgba(0,0,0,0.55),0_36px_80px_-28px_rgba(0,0,0,0.45)]'
      )}
    >
      <div className="flex shrink-0 items-start justify-between gap-3 border-b border-lab-line px-5 pb-4 pt-4">
        <PhotoMetaHeader photo={photo} className="pr-2" />
        <IconButton
          label="收起拍摄信息"
          onClick={onClose}
          className="-mr-2.5 -mt-2 h-11 w-11 wide:-mr-2 wide:-mt-1 wide:h-8 wide:w-8"
        >
          <X className="h-[18px] w-[18px] wide:h-4 wide:w-4" />
        </IconButton>
      </div>

      <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5">
        <PhotoMetaSections
          photo={photo}
          showDate={false}
          showTheme={false}
          showMap
        />
      </div>
    </div>
  );
}
