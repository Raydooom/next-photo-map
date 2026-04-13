'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Map from '@/app/footprint/_components/Map';
import { PhotoItem, PhotoDetail, PhotoLocation } from '@/types';
import { MarkerPoint, MapMarker } from '@/types/mapMarker';
import { groupByLocation } from '@/components/Map/helper';
import Carousel from '@/components/common/Carousel';
import { useSearchParams } from 'next/navigation';
import { replaceUrl } from '@/utils/history';

interface HotMapProps {
  hotPhotos: {
    total: number;
    list: PhotoDetail[];
  };
}

export function HotMap({ hotPhotos }: HotMapProps) {
  const searchParams = useSearchParams();
  const photoId = Number(searchParams.get('photoId')) || undefined;

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

  const handleSelect = useCallback(
    (id: number) => {
      if (id !== photoId) {
        replaceUrl(`${window.location.pathname}?photoId=${id}`);
      }
    },
    [photoId]
  );

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
    <div className="flex h-screen">
      {/* 左侧轮播图 */}
      <div className="w-1/3 h-full">
        <Carousel
          slides={hotPhotos.list}
          options={{ loop: true }}
          plugins={[]}
          currentId={photoId}
          onSelect={handleSelect}
        />
      </div>

      {/* 右侧地图 */}
      <div className="w-2/3 h-full relative">
        <Map markerGroup={markerGroup} />
        {/* 统计信息 */}
        <div className="absolute bottom-4 right-4 bg-background/70 p-2 rounded-md text-sm">
          <div>城市数量: {totalCities}</div>
          <div>总图片数量: {hotPhotos.total}</div>
        </div>
      </div>
    </div>
  );
}
