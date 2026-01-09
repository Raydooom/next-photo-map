'use client';

import React from 'react';
import {
  MinusIcon,
  PlusIcon,
  NavigationIcon,
  RotationIcon
} from '@/components/Icons/button';
import { addToast } from '@heroui/toast';

interface MapControlsProps {
  mapInstance: any; // 百度地图实例
}

export const MapControls = ({ mapInstance }: MapControlsProps) => {
  // 放大
  const handleZoomIn = () => {
    if (!mapInstance) return;
    mapInstance.setZoom(mapInstance.getZoom() + 1);
  };

  // 缩小
  const handleZoomOut = () => {
    if (!mapInstance) return;
    mapInstance.setZoom(mapInstance.getZoom() - 1);
  };

  // 方向回正 (重置 Heading 和 Tilt)
  const handleResetRotation = () => {
    if (!mapInstance) return;
    // 使用 setHeading 和 setTilt，或者直接使用 easeTo 实现平滑动画
    mapInstance.setHeading(0); // 设为正北
    mapInstance.setTilt(0); // 设为俯视
  };

  // 定位到当前位置
  const handleLocate = () => {
    if (!mapInstance) return;
    const geolocation = new window.BMapGL.Geolocation();
    geolocation.getCurrentPosition((r: any) => {
      console.log(geolocation.getStatus());
      if (geolocation.getStatus() === 0) {
        // 0 代表成功
        mapInstance.panTo(r.point);
        mapInstance.setZoom(15); // 定位后放大到 15 级
      } else {
        addToast({
          title: '定位失败',
          description: '请检查定位权限',
          color: 'warning',
          variant: 'solid'
        });
      }
    });
  };

  return (
    <div className="absolute right-6 bottom-10 flex flex-col items-end gap-3 z-[100]">
      {/* 方向回正按钮 */}
      <div className="mb-10 rounded-3xl flex-col flex shadow-xl">
        {/* 放大按钮 */}
        <PlusIcon
          radius="none"
          className="rounded-t-3xl mb-[1px] shadow-none"
          onClick={handleZoomIn}
        ></PlusIcon>
        {/* 缩小按钮 */}
        <MinusIcon
          radius="none"
          className="rounded-b-3xl shadow-none"
          onClick={handleZoomOut}
        ></MinusIcon>
      </div>
      <RotationIcon onClick={handleResetRotation}></RotationIcon>
      {/* 定位按钮 */}
      <NavigationIcon onClick={handleLocate}></NavigationIcon>
    </div>
  );
};
