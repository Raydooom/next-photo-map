import { useEffect, useRef, useState } from 'react';
import { useTheme } from 'next-themes';

declare global {
  interface Window {
    BMapGL: any;
  }
}

interface BaiduMapProps {
  center?: { lng: number; lat: number };
  config?: {
    enableScrollWheelZoom?: boolean;
    zoom?: number;
  };
  events?: {
    onMapLoad?: (map: any) => void; // 地图加载完成事件
  };
}
export const useBaiduMap = ({
  center, // 建议默认值在逻辑内部处理，避免引用变化
  config = {},
  events
}: BaiduMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapInstance, setMapInstance] = useState<any>(null);
  const isInitialized = useRef(false); // 关键：记录是否已完成首次初始化

  const [isLoadingTiles, setIsLoadingTiles] = useState(true);

  const { theme } = useTheme();

  // 1. 初始化地图实例（仅执行一次）
  useEffect(() => {
    const onTilesLoaded = () => {
      setIsLoadingTiles(false);
    };
    if (
      mapRef.current &&
      !mapInstance &&
      typeof window !== 'undefined' &&
      window.BMapGL
    ) {
      const BMapGL = window.BMapGL;
      const map = new BMapGL.Map(mapRef.current);

      // 设置一些不常变动的初始配置
      if (config.enableScrollWheelZoom !== false) {
        map.enableScrollWheelZoom(true);
      }

      setMapInstance(map);
      events?.onMapLoad?.(map);

      // 瓦片加载事件
      map.addEventListener('tilesloaded', onTilesLoaded);
    }
    return () => {
      mapInstance?.removeEventListener('tilesloaded', onTilesLoaded);
    };
  }, []); // 严格限制只在挂载时运行

  // 2. 只有在首次加载或 center 真正变化时执行 centerAndZoom
  useEffect(() => {
    if (mapInstance && center && !isInitialized.current) {
      mapInstance.centerAndZoom(
        new window.BMapGL.Point(center.lng, center.lat),
        config.zoom ?? 11
      );
      isInitialized.current = true; // 标记初始化完成
    }
  }, [mapInstance, center?.lng, center?.lat, config.zoom]);
  // 优化点：直接依赖数值而非对象引用

  // 3. 动态切换主题
  useEffect(() => {
    if (mapInstance) {
      mapInstance.setMapStyleV2({
        styleId:
          theme === 'dark'
            ? 'fef1c39c1f296afc207e545b60f5c60c'
            : 'e7a919669a710ab7163305484c4f3dc4'
      });
    }
  }, [mapInstance, theme]);

  const centerAndZoom = (
    point: { lng: number; lat: number } | [number, number],
    zoom?: number
  ) => {
    if (mapInstance) {
      const [lng, lat] = Array.isArray(point) ? point : [point.lng, point.lat];
      mapInstance.centerAndZoom(new window.BMapGL.Point(lng, lat), zoom ?? 11);
    }
  };

  const flyTo = (
    point: { lng: number; lat: number } | [number, number],
    offset?: [number, number]
  ) => {
    if (mapInstance) {
      const [lng, lat] = Array.isArray(point) ? point : [point.lng, point.lat];
      const pointObj = new window.BMapGL.Point(lng, lat);
      const pixel = mapInstance.pointToPixel(pointObj);
      if (offset) {
        pixel.x += offset[1] || 0;
        pixel.y += offset[0] || 0;
      }
      const pixelObj = mapInstance.pixelToPoint(pixel);
      mapInstance.flyTo(pixelObj);
    }
  };
  return { mapRef, isLoadingTiles, mapInstance, centerAndZoom, flyTo };
};
