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
    <section className="relative border-glass flex-auto bg-background/60 rounded overflow-hidden shadow-card h-[280px] sm:h-[360px] md:h-full">
      <Carousel
        slides={photosWithLocation}
        imageFit="cover"
        className="h-full w-full"
        disableLive={true}
        showIndicators={true}
        onSelect={setSelectedPhoto}
      />

      {selectedPhoto?.location?.latitude &&
        selectedPhoto?.location?.longitude && (
          <div className="hidden sm:block absolute left-4 bottom-4 w-64 md:w-80 h-40 md:h-50 z-10 rounded shadow-card border-glass overflow-hidden">
            <SingleMarker
              point={[
                selectedPhoto.location.longitude,
                selectedPhoto.location.latitude
              ]}
              photoId={selectedPhoto?.id}
            />
            <div className="absolute bottom-2 left-2 px-3 py-2 rounded-full bg-background/50 backdrop-blur-md shadow-md">
              <div className="flex items-center gap-1 text-xs text-main">
                <DateIcon className="w-3 h-3 shrink-0" />
                {formatTakenDate(selectedPhoto?.takenAt)}
                <span className="text-sub">·</span>
                <LocationIcon className="w-3 h-3 shrink-0" />
                {selectedPhoto?.location?.city}{' '}
                {selectedPhoto?.location?.district}
              </div>
            </div>
          </div>
        )}
    </section>
  );
};
