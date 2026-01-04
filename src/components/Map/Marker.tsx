'use client';
import { useEffect, useState } from 'react';
import { MarkerComponentProps } from './type';
import { UseBaiduMap, UseBMapPointConverter } from './hooks';
import { renderToString } from 'react-dom/server';
import { getLucideOverlayClass } from './helper';

export const Marker = (props: MarkerComponentProps) => {
  const { exifData } = props;
  const [markerPoint, setMarkerPoint] = useState<{
    lng: number;
    lat: number;
  }>();
  const { mapRef, mapInstance } = UseBaiduMap({
    center: markerPoint,
    config: {
      zoom: 18,
      enableScrollWheelZoom: false
    }
  });

  const point = UseBMapPointConverter(exifData);
  useEffect(() => {
    if (point) {
      mapInstance?.clearOverlays();

      const LucideOverlay = getLucideOverlayClass();
      if (!LucideOverlay) return;
      const svgString = renderToString(
        <div className="relative flex flex-col items-center group cursor-pointer">
          {/* 连接处与底部光点 */}
          <div className="flex flex-col items-center -mt-1">
            {/* 呼吸灯效果的外圈 */}
            <div className="relative flex items-center justify-center">
              <div className="absolute w-4 h-4 bg-brand-primary rounded-full animate-ping opacity-75" />
              <div className="relative w-3 h-3 bg-white rounded-full border-3 border-brand-primary shadow-[0_0_12px_#fff]" />
            </div>
          </div>
        </div>
      );

      const customMarker = new LucideOverlay(point, svgString, {
        size: 32
      });
      mapInstance?.addOverlay(customMarker);

      setMarkerPoint(point);
    }
  }, [point, mapInstance]);

  if (!markerPoint) {
    return null;
  }

  return <div ref={mapRef} style={{ width: '100%', height: '100%' }} />;
};
