'use client';

import React from 'react';
import maplibregl from 'maplibre-gl';

interface ClusterMarkerProps {
  map: maplibregl.Map;
  cluster: {
    id: string | number;
    coordinates: [number, number];
    properties: {
      point_count: number;
      point_count_abbreviated: string | number;
      cluster: boolean;
      data?: any;
    };
  };
  onClick?: (e: React.MouseEvent, cluster: any) => void;
}

export const ClusterMarker: React.FC<ClusterMarkerProps> = ({
  map,
  cluster,
  onClick
}) => {
  const { coordinates, properties } = cluster;
  const isCluster = properties.cluster;
  const count = properties.point_count || 1;

  // 将地理坐标转换为屏幕坐标（用于绝对定位）
  const pos = map.project(coordinates as [number, number]);

  // 根据数量决定大小
  const size = isCluster ? Math.min(40 + count * 0.5, 80) : 40;

  return (
    <div
      className="absolute flex items-center justify-center cursor-pointer transition-transform duration-200 hover:scale-110 select-none z-10"
      style={{
        left: pos.x,
        top: pos.y,
        transform: `translate(-50%, -50%)`,
        width: size,
        height: size
      }}
      onClick={e => onClick?.(e, cluster)}
    >
      {isCluster ? (
        <div className="relative w-full h-full flex items-center justify-center">
          {/* 外圈动画 */}
          <div className="absolute inset-0 rounded-full bg-primary/20 animate-pulse" />
          {/* 主圆圈 */}
          <div className="w-4/5 h-4/5 rounded-full bg-primary shadow-lg flex items-center justify-center border-2 border-white/50">
            <span className="text-white font-bold text-sm">
              {properties.point_count_abbreviated}
            </span>
          </div>
        </div>
      ) : (
        <div className="w-8 h-8 rounded-full bg-white shadow-xl border-2 border-primary overflow-hidden">
          {properties.data?.thumbnail ? (
            <img
              src={properties.data.thumbnail}
              alt="marker"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-primary/10 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-primary" />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
