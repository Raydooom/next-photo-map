'use client';
import { useMemo, useState } from 'react';
import Carousel from '@/components/Carousel';
import { PhotoItem } from '@/types';
import { SingleMarker } from '../Map';
import { LocationIcon, DateIcon } from '../Icons/icon';
import { formatTakenDate } from '@/utils/format';

export const Banner = ({ photos }: { photos: PhotoItem[] }) => {
  const photosWithLocation = useMemo(() => {
    return photos.filter(
      (photo): photo is PhotoItem =>
        photo.location?.latitude !== undefined &&
        photo.location?.longitude !== undefined
    );
  }, [photos]);
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoItem | null>(null);

  return (
    <section className="relative border-glass flex-auto bg-background rounded overflow-hidden shadow-card">
      {/* 全屏轮播图区域 */}
      <div className="relative h-full overflow-hidden">
        <Carousel
          slides={photosWithLocation}
          imageFit="cover"
          className="h-full w-full"
          disableLive={true}
          showIndicators={true}
          onSelect={setSelectedPhoto}
        />

        {/* 左下方地图小卡片 */}
        {selectedPhoto?.location?.latitude &&
          selectedPhoto?.location?.longitude && (
            <div className="absolute left-4 bottom-4 w-80 p-3 bg-background/60 z-10 rounded shadow-card border-glass backdrop-blur">
              <div className="flex items-center gap-1 text-sub text-xs my-1 pl-1">
                <DateIcon className="w-3 h-3" />
                {formatTakenDate(selectedPhoto?.takenAt)}
                <span className="px-1 text-lg line-height-1">·</span>
                <LocationIcon className="w-3 h-3" />
                {selectedPhoto?.location?.city}{' '}
                {selectedPhoto?.location?.district}
              </div>
              <div className="w-full h-40 shadow-sm rounded overflow-hidden">
                <SingleMarker
                  point={[
                    selectedPhoto.location?.longitude,
                    selectedPhoto.location?.latitude
                  ]}
                  photoId={selectedPhoto?.id}
                />
              </div>
            </div>
          )}
      </div>
    </section>
  );
};
