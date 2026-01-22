'use client';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { MarkerComponentProps } from './type';
import { useBaiduMap } from './hooks';
import { renderToString } from 'react-dom/server';
import { getLucideOverlayClass, coordTransform } from './helper';
import MarkerIcon from './modules/MarkerIcon';

export const Marker = (props: MarkerComponentProps) => {
  const { exifData } = props;
  const { mapRef, mapInstance, isInitialized, setCenterAndZoom } = useBaiduMap({
    config: {
      enableScrollWheelZoom: false
    }
  });
  const memoizedPoint = useMemo(() => {
    if (!exifData?.latitude || !exifData?.longitude) return null;
    return coordTransform.transformToBaidu({
      lng: exifData.longitude,
      lat: exifData.latitude
    });
  }, [exifData]);

  useEffect(() => {
    if (memoizedPoint && isInitialized) {
      mapInstance?.clearOverlays();

      const LucideOverlay = getLucideOverlayClass();
      if (!LucideOverlay) return;
      const svgString = renderToString(<MarkerIcon />);

      const customMarker = new LucideOverlay(memoizedPoint, svgString, {
        size: 14,
        fixOffset: true,
        onClick: (e: MouseEvent) => {
          window.open(`/footprint?id=${exifData?.photoId}`, '_blank');
        }
      });
      mapInstance?.addOverlay(customMarker);
      setCenterAndZoom(memoizedPoint, 15);
    }
  }, [memoizedPoint, mapInstance, exifData]);

  if (!memoizedPoint) {
    return null;
  }

  return <div ref={mapRef} style={{ width: '100%', height: '100%' }} />;
};
