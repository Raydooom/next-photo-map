'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import maplibreGl from 'maplibre-gl';
import { OpenInNewWindowIcon } from '@/components/Icons/button';
import { useMapBase } from '../hooks/useMapBase';
import { MarkerIcon } from '@/components/Icons/custom';

interface SingleMarkerProps {
  point: [number, number];
  photoId?: number;
}

export const SingleMarker = ({ point, photoId }: SingleMarkerProps) => {
  const { mapRef, mapInstance } = useMapBase();

  const [isInit, setIsInit] = useState(true);
  useEffect(() => {
    // 初始化时设置地图中心
    if (mapInstance) {
      if (isInit) {
        mapInstance.once('idle', () => {
          mapInstance.panTo(point);
          setIsInit(false);
        });
      } else {
        mapInstance.flyTo({
          center: point,
          zoom: 12, // 移动后的缩放级别
          duration: 2000, // 动画时长
          curve: 1.42, // 飞行曲线（数值越大，轨迹越“拱”）
          essential: true // 如果用户有“减少动画”设置，该动画仍会执行
        });
      }
    }
  }, [mapInstance, point]);

  const JumpMap = (photoId: number) => {
    window.open(`/footprint?photoId=${photoId}`, '_blank');
  };
  return (
    <section ref={mapRef} className="h-full relative">
      {photoId && (
        <div className="group absolute z-10 right-2 bottom-2 bg-background/80 rounded transition-all duration-200 flex items-end justify-end">
          <OpenInNewWindowIcon onClick={() => JumpMap(photoId)} />
        </div>
      )}
      {mapInstance && point && (
        <Marker map={mapInstance} point={point}>
          <MarkerIcon />
        </Marker>
      )}
    </section>
  );
};

const Marker = ({
  map,
  point,
  children
}: {
  map: maplibreGl.Map;
  point: [number, number];
  children: React.ReactNode;
}) => {
  const container = useMemo(() => {
    const el = document.createElement('div');
    el.className = 'custom-marker-container';
    return el;
  }, []);

  const markerRef = useRef<maplibreGl.Marker | null>(null);

  useEffect(() => {
    if (!markerRef.current) {
      const marker = new maplibreGl.Marker({
        element: container
      })
        .setLngLat(point)
        .addTo(map);

      markerRef.current = marker;
    } else {
      markerRef.current.setLngLat(point);
    }
    return () => {
      markerRef.current?.remove();
      markerRef.current = null;
    };
  }, [map, container, point]);

  return createPortal(children, container);
};
