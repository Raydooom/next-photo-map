'use client';

import React, { useMemo } from 'react';
import Map from '@/app/footprint/_components/Map';
import { PhotoDetail, PhotoLocation, PhotoItem } from '@/types';
import { MarkerPoint } from '@/types/mapMarker';
import { groupByLocation } from '@/components/Map/helper';
import Carousel from '@/components/Carousel';
import { Calendar } from './Calendar';
import { useSearchParams } from 'next/navigation';

interface HotMapProps {
  hotPhotos: {
    total: number;
    list: PhotoDetail[];
  };
}

export function HotMap({ hotPhotos }: HotMapProps) {
  const searchParams = useSearchParams();
  const photoId = Number(searchParams.get('photoId')) || undefined;

  const currentPhoto = useMemo(() => {
    return hotPhotos.list.find(p => p.id === photoId) || hotPhotos.list[0];
  }, [photoId, hotPhotos.list]);

  const photosWithLocation = hotPhotos.list.filter(
    (photo): photo is PhotoDetail & { location: PhotoLocation } =>
      photo.location?.latitude !== undefined &&
      photo.location?.longitude !== undefined
  );

  const markers = photosWithLocation.map(photo => ({
    ...photo.location,
    id: photo.id,
    takenAt: photo.takenAt,
    thumbnail: photo.thumbSmallUrl,
    point: {
      longitude: photo.location.longitude,
      latitude: photo.location.latitude
    } as MarkerPoint
  })) as (PhotoLocation & {
    point: MarkerPoint;
    id: number;
    takenAt: string | null;
    thumbnail: string;
  })[];

  const markerGroup = Object.values(groupByLocation(markers, 4));

  const totalCities = useMemo(() => {
    const cities = new Set<string>();
    hotPhotos.list.forEach(photo => {
      if (photo.location?.city) {
        cities.add(photo.location.city);
      }
    });
    return cities.size;
  }, [hotPhotos.list]);

  return (
    <main className="flex h-[450px]">
      <section className="relative border border-border bg-background rounded-3xl overflow-hidden shadow-2xl">
        {/* 全屏轮播图区域 */}
        <div className="relative flex-1 h-full overflow-hidden">
          <Carousel
            slides={hotPhotos.list as PhotoItem[]}
            options={{ loop: true }}
            plugins={[]}
            currentId={photoId}
            imageFit="cover"
            className="h-full w-full"
          />

          {/* 左下方地图小卡片 */}
          <div className="absolute left-6 bottom-6 w-80 h-50 z-10 rounded-3xl overflow-hidden shadow-2xl border-4 border-white/30 backdrop-blur-xl group hover:scale-105 transition-transform duration-300">
            <div className="w-full h-full relative">
              <Map markerGroup={markerGroup} hideBackIcon={true} />

              {/* 悬浮统计信息 */}
              <div className="absolute top-3 right-3 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-2xl text-white text-[10px] flex gap-3 border border-white/10">
                <div className="flex flex-col items-center">
                  <span className="opacity-60 uppercase font-bold tracking-widest scale-75">
                    Cities
                  </span>
                  <span className="font-bold text-sm leading-none mt-1">
                    {totalCities}
                  </span>
                </div>
                <div className="w-[1px] h-4 bg-white/20 self-center" />
                <div className="flex flex-col items-center">
                  <span className="opacity-60 uppercase font-bold tracking-widest scale-75">
                    Photos
                  </span>
                  <span className="font-bold text-sm leading-none mt-1">
                    {hotPhotos.total}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 右侧日历区域 */}
      <div className="w-80 h-full pl-3 shrink-0">
        <Calendar date={currentPhoto?.takenAt} />
      </div>
    </main>
  );
}
