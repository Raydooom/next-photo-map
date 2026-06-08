import React from 'react';
import * as Actions from '@/server/actions';
import { Divider } from '@heroui/divider';
import { Banner } from './Banner';
import { AreaMap } from './AreaMap';
import { PhotoLocation } from '@/types';

interface CountItem {
  count: number;
  label: string;
}

/** 统计数据条（照片 / 城市 / 足迹） */
function StatsBar({
  countList,
  className = ''
}: {
  countList: CountItem[];
  className?: string;
}) {
  return (
    <section
      className={`rounded border-glass backdrop-blur bg-background/40 flex items-center justify-around gap-2 px-4 ${className}`}
    >
      {countList.map((item, index) => (
        <React.Fragment key={item.label}>
          <div className="flex flex-col gap-1 justify-center items-center">
            <b className="text-xl md:text-2xl font-medium tracking-tight">
              {item.count}
            </b>
            <p className="text-xs md:text-sm font-medium text-sub">
              {item.label}
            </p>
          </div>
          {index < countList.length - 1 && (
            <Divider className="h-10" orientation="vertical" />
          )}
        </React.Fragment>
      ))}
    </section>
  );
}

export async function HeroSection() {
  const bannerPhotos = await Actions.getPhotoList({
    pageSize: 5,
    withLocation: true,
    withExif: true,
    top: true
  });

  const locations = await Actions.getLocations({
    select: { adcode: true, city: true }
  });

  const allPhotosCount = await Actions.countAllPhotos();

  const cities = Array.from(
    new Set(locations.map((item: PhotoLocation) => item.city))
  );

  const countList: CountItem[] = [
    { count: allPhotosCount, label: '照片' },
    { count: cities.length, label: '城市' },
    { count: locations.length, label: '足迹' }
  ];

  return (
    <main className="flex flex-col md:flex-row gap-4 md:h-[450px]">
      {/* 轮播 Banner */}
      <Banner photos={bannerPhotos.list} />

      {/* 右侧地图区域：小屏隐藏，平板及以上显示 */}
      <div className="hidden md:block md:w-72 lg:w-80 h-full rounded border-glass shadow-card overflow-hidden relative shrink-0">
        <AreaMap data={locations} />
        <StatsBar
          countList={countList}
          className="absolute z-10 bottom-4 left-4 right-4 h-20"
        />
      </div>

      {/* 小屏：地图隐藏时，单独展示统计条 */}
      <StatsBar countList={countList} className="flex md:hidden h-20" />
    </main>
  );
}
