'use client';
import { useBaiduMap } from '@/components/Map';
import { useEffect } from 'react';

export default function Map({ markerGroup }: { markerGroup?: any[] }) {
  const { mapRef, mapInstance } = useBaiduMap({
    center: { lng: 116.404, lat: 39.915 },
    config: {
      zoom: 11
    }
  });

  useEffect(() => {
    if (markerGroup?.length && mapInstance) {
      markerGroup.forEach(item => {
        const point = new window.BMapGL.Point(item.point[0], item.point[1]);
        const marker = new window.BMapGL.Marker(point);
        mapInstance.addOverlay(marker);
      });
    }
  }, [markerGroup, mapInstance]);

  return (
    <>
      <div ref={mapRef} className="w-screen h-screen" />
    </>
  );
}
