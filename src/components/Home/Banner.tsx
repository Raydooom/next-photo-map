'use client';
import { useEffect, useMemo, useState } from 'react';
import Carousel from '@/components/Carousel';
import { PhotoItem } from '@/types';
import { useMapBase, SingleMarker, MarkerIcon } from '../Map';
import { LocationIcon, DateIcon } from '../Icons/icon';
import { formatTakenDate } from '@/utils/format';
import { OpenInNewWindowIcon } from '../Icons/button';

export const Banner = ({ photos }: { photos: PhotoItem[] }) => {
  const photosWithLocation = useMemo(() => {
    return photos.filter(
      (photo): photo is PhotoItem =>
        photo.locations?.latitude !== undefined &&
        photo.locations?.longitude !== undefined
    );
  }, [photos]);
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoItem | null>(null);

  console.log('👾 ~ :20 ~ Banner ~ selectedPhotolog:', selectedPhoto);

  const { mapRef, mapInstance } = useMapBase();

  const [isInit, setIsInit] = useState(true);
  useEffect(() => {
    // 初始化时设置地图中心
    if (selectedPhoto && mapInstance) {
      const center = [
        selectedPhoto?.locations?.longitude!,
        selectedPhoto?.locations?.latitude!
      ] as [number, number];
      if (isInit) {
        mapInstance.once('idle', () => {
          mapInstance.panTo(center);
          setIsInit(false);
        });
      } else {
        mapInstance.flyTo({
          center,
          zoom: 12, // 移动后的缩放级别
          duration: 2000, // 动画时长
          curve: 1.42, // 飞行曲线（数值越大，轨迹越“拱”）
          essential: true // 如果用户有“减少动画”设置，该动画仍会执行
        });
      }
    }
  }, [mapInstance, selectedPhoto]);

  const JumpMap = (photoId: number) => {
    window.open(`/footprint?photoId=${photoId}`, '_blank');
  };
  return (
    <section className="relative border border-border bg-background rounded-3xl overflow-hidden shadow-2xl">
      {/* 全屏轮播图区域 */}
      <div className="relative flex-1 h-full overflow-hidden">
        <Carousel
          slides={photosWithLocation}
          imageFit="cover"
          className="h-full w-full"
          disableLive={true}
          showIndicators={true}
          onSelect={setSelectedPhoto}
        />

        {/* 左下方地图小卡片 */}
        <div className="absolute left-4 bottom-4 w-80 p-3 bg-background/60 z-10 rounded shadow-2xl border border-border/10 backdrop-blur">
          <div className="flex items-center gap-1 text-main/80 text-xs my-1 pl-1">
            <DateIcon className="w-3 h-3" />
            {formatTakenDate(selectedPhoto?.takenAt)}
            <span className="px-1 text-lg line-height-1">·</span>
            <LocationIcon className="w-3 h-3" />
            {selectedPhoto?.locations?.city}{' '}
            {selectedPhoto?.locations?.district}
          </div>
          <section
            ref={mapRef}
            className="h-[150px] rounded overflow-hidden relative shadow-sm"
          >
            <div className="group absolute z-10 right-2 bottom-2 bg-background/80 rounded transition-all duration-200 flex items-end justify-end">
              <OpenInNewWindowIcon
                onClick={() => JumpMap(selectedPhoto?.id!)}
                className=""
              />
            </div>
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
          {/* <div className=" top-3 right-3 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-2xl text-white text-[10px] flex gap-3 border border-white/10">
              <div className="flex flex-col items-center">
                <span className="opacity-60 uppercase font-bold tracking-widest scale-75">
                  Cities
                </span>
                <span className="font-bold text-sm leading-none mt-1">
                </span>
              </div>
              <div className="w-[1px] h-4 bg-white/20 self-center" />
              <div className="flex flex-col items-center">
                <span className="opacity-60 uppercase font-bold tracking-widest scale-75">
                  Photos
                </span>
                <span className="font-bold text-sm leading-none mt-1">
                </span>
              </div>
            </div> */}
        </div>
      </div>
    </section>
  );
};
