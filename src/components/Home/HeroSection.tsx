import React from 'react';
import * as Actions from '@/server/actions';
import { Divider } from '@heroui/divider';
import { Banner } from './Banner';
import { AreaMap } from './AreaMap';
import { PhotoLocation } from '@/types';

export async function HeroSection() {
  const bannerPhotos = await Actions.getPhotoList({
    pageSize: 5,
    withLocation: true,
    withExif: true
  });

  const locations = await Actions.getLocations({
    select: { adcode: true, city: true }
  });

  const allPhotosCount = await Actions.countAllPhotos();

  const cities = Array.from(
    new Set(locations.map((item: PhotoLocation) => item.city))
  );

  const countList = [
    { count: allPhotosCount, label: '照片' },
    { count: cities.length, label: '城市' },
    { count: locations.length, label: '足迹' }
  ];
  return (
    <main className="flex gap-4 h-[450px]">
      <Banner photos={bannerPhotos.list} />
      {/* 右侧日历区域 */}
      <div className="w-80 h-full rounded border border-border overflow-hidden relative shrink-0">
        <AreaMap data={locations} />
        <section
          className="absolute z-10 bottom-4 left-4 right-4
          rounded border border-border/60
          backdrop-blur bg-background/40 
          flex items-center justify-around gap-2
          h-20 px-4"
        >
          {countList.map((item, index) => (
            <React.Fragment key={item.label}>
              <div className="flex flex-col gap-1 justify-center items-center">
                <b className="text-2xl font-medium tracking-tight">
                  {item.count}
                </b>
                <p className="text-sm font-medium">{item.label}</p>
              </div>
              {index < countList.length - 1 && (
                <Divider className="h-10" orientation="vertical" />
              )}
            </React.Fragment>
          ))}
        </section>
      </div>
    </main>
  );
}
