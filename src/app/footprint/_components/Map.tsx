'use client';

import { useBaiduMap } from '@/components/Map';
import { useEffect, useRef } from 'react';
import { ReactOverlay } from '@/components/Map';

interface MapProps {
  markerGroup?: {
    point: [number, number];
    count?: number;
    coverUrl?: string;
    [key: string]: any;
  }[];
}

// 对应你图片效果的 React UI 组件
const PhotoMarkerUI = ({ data }: { data: any }) => {
  const isCluster = (data.count || 1) > 1;

  return (
    <div className="relative -translate-x-1/2 -translate-y-1/2 transition-transform hover:scale-110 active:scale-95 cursor-pointer">
      {/* 磨砂发光容器 */}
      <div
        className={`
        w-12 h-12 rounded-full flex items-center justify-center
        bg-zinc-900/60 backdrop-blur-xl border border-white/20
        shadow-[0_0_15px_rgba(255,255,255,0.2)] overflow-hidden
      `}
      >
        {isCluster ? (
          // 聚合点：显示图片背景和数字
          <div className="relative w-full h-full p-1">
            <div
              className="w-full h-full rounded-full bg-cover bg-center overflow-hidden"
              style={{
                backgroundImage: `url(${data.coverUrl || '/placeholder.jpg'})`
              }}
            >
              <div className="w-full h-full bg-indigo-600/40 flex items-center justify-center">
                <span className="text-white text-sm font-bold drop-shadow-md">
                  {data.count}
                </span>
              </div>
            </div>
          </div>
        ) : (
          // 单个点：显示相机图标
          <div className="text-white/80">
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
};

export default function Map({ markerGroup }: MapProps) {
  const { mapRef, mapInstance } = useBaiduMap({
    center: { lng: 116.404, lat: 39.915 },
    config: { zoom: 11 }
  });

  const overlaysRef = useRef<any[]>([]);

  useEffect(() => {
    if (!mapInstance || !markerGroup) return;

    // 1. 清理之前的覆盖物
    overlaysRef.current.forEach(ov => mapInstance.removeOverlay(ov));
    overlaysRef.current = [];

    // 2. 遍历数据创建 React 覆盖物
    markerGroup.forEach(item => {
      const pt = new window.BMapGL.Point(item.point[0], item.point[1]);

      // 创建自定义 React 覆盖物实例
      const overlay = new ReactOverlay(pt, <PhotoMarkerUI data={item} />);

      mapInstance.addOverlay(overlay);
      overlaysRef.current.push(overlay);
    });

    return () => {
      overlaysRef.current.forEach(ov => mapInstance.removeOverlay(ov));
    };
  }, [mapInstance, markerGroup]);

  return (
    <div className="relative w-full h-screen overflow-hidden">
      <div ref={mapRef} className="w-full h-full" />
    </div>
  );
}
