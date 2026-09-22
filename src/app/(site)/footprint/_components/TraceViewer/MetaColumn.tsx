'use client';

import { PhotoItem } from '@/lib/types';
import { PhotoMetaSections } from '@/components/photo/PhotoMetaSections';

/** 地图单张查看器复用轮播同一套可滚动信息内容。 */
export function MetaColumn({
  photo,
  showDate = true,
  showTheme = true
}: {
  photo: PhotoItem;
  showDate?: boolean;
  showTheme?: boolean;
}) {
  return (
    <PhotoMetaSections
      photo={photo}
      showDate={showDate}
      showTheme={showTheme}
      readoutLayoutClassName="grid grid-cols-2 gap-x-5 gap-y-5"
    />
  );
}
