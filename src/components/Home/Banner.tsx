'use client';
import { useEffect, useMemo, useState } from 'react';
import Carousel from '@/components/Carousel';
import { PhotoItem } from '@/types';
import { useMapBase, SingleMarker, MarkerIcon } from '../Map';

export const Banner = ({ photos }: { photos: PhotoItem[] }) => {
  const photosWithLocation = useMemo(() => {
    return photos.filter(
      (photo): photo is PhotoItem =>
        photo.locations?.latitude !== undefined &&
        photo.locations?.longitude !== undefined
    );
  }, [photos]);
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoItem | null>(null);

  const { mapRef, mapInstance } = useMapBase();

  const [isInit, setIsInit] = useState(true);
  useEffect(() => {
    // 初始化时设置地图中心
    if (selectedPhoto && mapInstance && isInit) {
      mapInstance.once('idle', () => {
        mapInstance.panTo([
          selectedPhoto?.locations?.longitude!,
          selectedPhoto?.locations?.latitude!
        ]);
        setIsInit(false);
      });
    }
  }, [mapInstance, selectedPhoto]);

  return (
    <section className="relative border border-border bg-background rounded-3xl overflow-hidden shadow-2xl">
      {/* 全屏轮播图区域 */}
      <div className="relative flex-1 h-full overflow-hidden">
        <Carousel
          slides={photosWithLocation}
          imageFit="cover"
          className="h-full w-full"
          disableLive={true}
          onSelect={setSelectedPhoto}
        />

        {/* 左下方地图小卡片 */}
        <div className="absolute left-6 bottom-6 w-80 h-50 z-10 rounded overflow-hidden shadow-2xl border-4 border-white/30 backdrop-blur-xl">
          <div className="w-full h-full relative">
            <section ref={mapRef} className="w-full h-full">
              {mapInstance && selectedPhoto && (
                <SingleMarker
                  map={mapInstance}
                  longitude={selectedPhoto?.locations?.longitude!}
                  latitude={selectedPhoto?.locations?.latitude!}
                >
                  <MarkerIcon />
                </SingleMarker>
              )}
            </section>

            {/* 悬浮统计信息 */}
            <div className="absolute top-3 right-3 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-2xl text-white text-[10px] flex gap-3 border border-white/10">
              <div className="flex flex-col items-center">
                <span className="opacity-60 uppercase font-bold tracking-widest scale-75">
                  Cities
                </span>
                <span className="font-bold text-sm leading-none mt-1">
                  {/* {totalCities} */}
                </span>
              </div>
              <div className="w-[1px] h-4 bg-white/20 self-center" />
              <div className="flex flex-col items-center">
                <span className="opacity-60 uppercase font-bold tracking-widest scale-75">
                  Photos
                </span>
                <span className="font-bold text-sm leading-none mt-1">
                  {/* {hotPhotos.total} */}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
