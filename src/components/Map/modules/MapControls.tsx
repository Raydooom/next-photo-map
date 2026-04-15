'use client';

import React from 'react';
import {
  MinusIcon,
  PlusIcon,
  NavigationIcon,
  RotationIcon
} from '@/components/Icons/button';
import { addToast } from '@heroui/toast';
import maplibregl from 'maplibre-gl';

interface MapControlsProps {
  mapInstance: maplibregl.Map | null;
}

export const MapControls = ({ mapInstance }: MapControlsProps) => {
  // 放大
  const handleZoomIn = () => {
    if (!mapInstance) return;
    mapInstance.zoomTo(mapInstance.getZoom() + 1, { duration: 500 });
  };

  // 缩小
  const handleZoomOut = () => {
    if (!mapInstance) return;
    mapInstance.zoomTo(mapInstance.getZoom() - 1, { duration: 500 });
  };

  // 方向回正
  const handleResetRotation = () => {
    if (!mapInstance) return;
    mapInstance.resetNorthPitch({ duration: 500 });
  };

  // 定位到当前位置
  const handleLocate = () => {
    if (!mapInstance) return;

    navigator.geolocation.getCurrentPosition(
      position => {
        const { latitude, longitude } = position.coords;
        mapInstance.flyTo({
          center: [longitude, latitude],
          zoom: 15,
          duration: 1000
        });
      },
      error => {
        addToast({
          title: '定位失败',
          description: '请检查定位权限',
          color: 'warning',
          variant: 'solid'
        });
      }
    );
  };

  return (
    <div className="absolute right-6 bottom-10 flex flex-col items-end gap-3 z-[100]">
      <div className="mb-10 rounded-3xl flex-col flex shadow-xl">
        <PlusIcon
          radius="none"
          className="rounded-t-3xl mb-[1px] shadow-none"
          onClick={handleZoomIn}
        />
        <MinusIcon
          radius="none"
          className="rounded-b-3xl shadow-none"
          onClick={handleZoomOut}
        />
      </div>
      <RotationIcon onClick={handleResetRotation} />
      <NavigationIcon onClick={handleLocate} />
    </div>
  );
};
