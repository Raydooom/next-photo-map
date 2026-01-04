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

export const UseBaiduMap = ({
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
      console.log('theme', theme);
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
  }, [mapInstance, center, config.zoom]);

  useEffect(() => {
    config.enableScrollWheelZoom ?? mapInstance?.enableScrollWheelZoom(true);
  }, [mapInstance, config.enableScrollWheelZoom]);

  return { mapRef, mapInstance };
};

// 将 EXIF 数据转换为百度地图坐标
export const UseBMapPointConverter = (exifData?: ExifType) => {
  const [point, setPoint] = useState(undefined);
  const {
    GPSGpslongitude,
    GPSGpslongituderef,
    GPSGpslatitude,
    GPSGpslatituderef
  } = exifData || {};
  useEffect(() => {
    if (!GPSGpslatitude || !GPSGpslongitude) {
      return;
    }
    var convertor = new window.BMapGL.Convertor();
    var point = new window.BMapGL.Point(
      convertToDecimal(GPSGpslongitude, GPSGpslongituderef),
      convertToDecimal(GPSGpslatitude, GPSGpslatituderef)
    );
    convertor.translate(
      [point],
      1,
      5,
      (data: { status: number; points: SetStateAction<undefined>[] }) => {
        if (data.status === 0) {
          setPoint(data.points[0]);
        }
      }
    );
  }, [GPSGpslatitude, GPSGpslongitude]);

  return point;
};
