import { ExifType } from '@/types';
import { convertToDecimal } from '@/utils/map';
import { SetStateAction, useEffect, useRef, useState } from 'react';
import { useTheme } from 'next-themes';

declare global {
  interface Window {
    BMapGL: any;
  }
}

interface BaiduMapProps {
  center?: { lng: number; lat: number };
  marker?: { lng: number; lat: number };
  zoom?: number;
  onMapLoad?: (map: any) => void;
  config?: {
    enableScrollWheelZoom?: boolean;
    zoom?: number;
  };
}

export const useBaiduMap = ({
  center = { lng: 116.404, lat: 39.915 },
  config = {},
  onMapLoad
}: BaiduMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapInstance, setMapInstance] = useState<any>(null);

  const { theme } = useTheme();
  useEffect(() => {
    if (mapRef.current && !mapInstance && typeof window !== 'undefined') {
      const BMapGL = window.BMapGL;
      if (BMapGL) {
        const mapInstance = new BMapGL.Map(mapRef.current);
        mapInstance?.setMapStyleV2({
          styleId: 'fef1c39c1f296afc207e545b60f5c60c'
        });
        setMapInstance(mapInstance);
        onMapLoad?.(mapInstance);
      }
    }
  }, [mapRef.current, mapInstance, onMapLoad]);

  useEffect(() => {
    if (mapInstance) {
      mapInstance?.setMapStyleV2({
        styleId:
          theme === 'dark'
            ? 'fef1c39c1f296afc207e545b60f5c60c'
            : 'e7a919669a710ab7163305484c4f3dc4'
      });
    }
  }, [mapInstance, theme]);

  useEffect(() => {
    mapInstance?.centerAndZoom(
      new window.BMapGL.Point(center.lng, center.lat),
      config.zoom ?? 11
    );
  }, [center, config.zoom]);

  useEffect(() => {
    config.enableScrollWheelZoom ?? mapInstance?.enableScrollWheelZoom(true);
  }, [mapInstance, config.enableScrollWheelZoom]);

  return { mapRef, mapInstance };
};
