import { useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import maplibreGl from 'maplibre-gl';
import { PointDirectionIcon } from '@/components/Icons/icon';
import { ClusterPointIcon } from '@/components/Icons/button';
import clsx from 'clsx';

interface ClusterMarkerProps {
  map: maplibreGl.Map;
  cluster: any;
  onClick: (cluster: any) => void;
}

export const ClusterMarker = ({
  map,
  cluster,
  onClick
}: ClusterMarkerProps) => {
  const container = useMemo(() => document.createElement('div'), []);
  const markerRef = useRef<maplibreGl.Marker | null>(null);

  useEffect(() => {
    // 1. 创建原生 Marker 实例
    // 由 MapLibre 内部的 requestAnimationFrame 驱动位置更新，极其丝滑
    const marker = new maplibreGl.Marker({
      element: container,
      anchor: 'center'
    })
      .setLngLat(cluster.coordinates)
      .addTo(map);

    markerRef.current = marker;

    return () => {
      marker.remove();
      markerRef.current = null;
    };
  }, [map, container]); // 仅在初始化和销毁时执行

  // 2. 响应位置变化
  useEffect(() => {
    if (markerRef.current) {
      markerRef.current.setLngLat(cluster.coordinates);
    }
  }, [cluster.coordinates]);

  const isCluster = cluster.properties?.cluster;
  const count = cluster.properties?.point_count || 1;
  const data = JSON.parse(cluster.properties?.data || '{}');

  // 朝向角度计算
  const deg = useMemo(() => {
    if (data?.list?.length === 1) {
      return data.list[0].bearing
        ? parseInt(String(data.list[0].bearing), 10)
        : null;
    }
  }, [data]);
  // 渲染具体的 UI
  return createPortal(
    <div onClick={() => onClick?.(cluster)}>
      {isCluster ? (
        <div
          className={`
                w-12 h-12 rounded-full flex items-center justify-center
                bg-background backdrop-blur-button border-1.5 border-main/[0.4]
                shadow-lg overflow-hidden
                hover:scale-105 transition-transform duration-200
              `}
        >
          <div className="relative w-full h-full p-1.5">
            <div
              className="w-full h-full rounded-full bg-cover bg-center overflow-hidden"
              style={{
                backgroundImage: `url('/cluster_placeholder.png')`
              }}
            >
              <div className="w-full h-full bg-background/40 flex items-center justify-center">
                <span className="text-main text-lg font-bold drop-shadow-md">
                  {count}
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          {deg ? (
            <div
              className="text-main w-full h-full text-xl absolute z-10 pointer-events-none"
              style={{
                transform: `rotate(${deg}deg)`
              }}
            >
              <PointDirectionIcon className="absolute -top-1.5 left-1/2 -translate-x-1/2" />
            </div>
          ) : null}
          <ClusterPointIcon
            onClick={() => onClick?.(cluster)}
            className={clsx(
              'bg-main border border-main/[0.4] text-xl text-main',
              'bg-main-highlight text-main'
            )}
          />
        </>
      )}
    </div>,
    container
  );
};
