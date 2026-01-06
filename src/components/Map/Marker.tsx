'use client';
import { useEffect, useState, useCallback } from 'react';
import { MarkerComponentProps } from './type';
import { useBaiduMap } from './hooks';
import { renderToString } from 'react-dom/server';
import { getLucideOverlayClass, coordTransform } from './helper';
import MarkerIcon from './modules/MarkerIcon';

export const Marker = (props: MarkerComponentProps) => {
  const { exifData } = props;
  const [markerPoint, setMarkerPoint] = useState<{
    lng: number;
    lat: number;
  }>();
  const { mapRef, mapInstance } = useBaiduMap({
    center: markerPoint,
    config: {
      zoom: 18,
      enableScrollWheelZoom: false
    }
  });
  const point = useCallback(() => {
    const pointArr = coordTransform.transformToBaidu(
      exifData!.GPSGpslatitude,
      exifData!.GPSGpslongitude
    );
    return {
      lat: pointArr[0],
      lng: pointArr[1]
    };
  }, [exifData]);

  useEffect(() => {
    if (point) {
      mapInstance?.clearOverlays();

      const LucideOverlay = getLucideOverlayClass();
      if (!LucideOverlay) return;
      const svgString = renderToString(<MarkerIcon />);

      const customMarker = new LucideOverlay(point(), svgString, {
        size: 32,
        fixOffset: false
      });
      mapInstance?.addOverlay(customMarker);
      setMarkerPoint(point());
    }
  }, [point, mapInstance]);

  if (!markerPoint) {
    return null;
  }

  return <div ref={mapRef} style={{ width: '100%', height: '100%' }} />;
};
