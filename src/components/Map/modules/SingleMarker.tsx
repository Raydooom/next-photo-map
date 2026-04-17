'use client';
import { useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import maplibreGl from 'maplibre-gl';

interface StaticMarkerProps {
  map: maplibreGl.Map;
  longitude: number;
  latitude: number;
  children: React.ReactNode;
  onClick?: () => void;
}

export const SingleMarker = ({
  map,
  longitude,
  latitude,
  children,
  onClick
}: StaticMarkerProps) => {
  // 1. 创建并持久化 DOM 容器
  const container = useMemo(() => {
    const el = document.createElement('div');
    el.className = 'custom-marker-container';
    return el;
  }, []);

  const markerRef = useRef<maplibreGl.Marker | null>(null);

  useEffect(() => {
    // 2. 初始化原生 Marker 实例
    const marker = new maplibreGl.Marker({
      element: container
    })
      .setLngLat([longitude, latitude])
      .addTo(map);

    markerRef.current = marker;

    // 绑定点击事件（原生 DOM 监听更可靠）
    if (onClick) {
      container.addEventListener('click', onClick);
    }

    return () => {
      marker.remove();
      if (onClick) {
        container.removeEventListener('click', onClick);
      }
    };
  }, [map, container, onClick]);

  // 3. 响应坐标变化（如：位置微调时不会销毁重建，而是平滑移动）
  useEffect(() => {
    if (markerRef.current) {
      markerRef.current.setLngLat([longitude, latitude]);
    }
    map.flyTo({
      center: [longitude, latitude],
      zoom: 12, // 移动后的缩放级别
      duration: 2000, // 动画时长
      curve: 1.42, // 飞行曲线（数值越大，轨迹越“拱”）
      essential: true // 如果用户有“减少动画”设置，该动画仍会执行
    });
  }, [longitude, latitude]);

  // 4. 将 React 内容传送到原生 DOM
  return createPortal(children, container);
};
