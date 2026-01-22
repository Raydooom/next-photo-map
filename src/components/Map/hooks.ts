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
}: BaiduMapProps = {}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapInstance, setMapInstance] = useState<any>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const [isLoadingTiles, setIsLoadingTiles] = useState(true);

  const { theme } = useTheme();

  // 初始化地图实例（仅执行一次）
  useEffect(() => {
    const onTilesLoaded = () => {
      setIsLoadingTiles(false);
    };

    const BMapGL = window.BMapGL;
    const map = new BMapGL.Map(mapRef.current);
    // 设置一些不常变动的初始配置
    if (config.enableScrollWheelZoom !== false) {
      map.enableScrollWheelZoom(true);
    }
    // 首次加载时设置中心和缩放级别
    if (center) {
      map.centerAndZoom(
        new window.BMapGL.Point(center.lng, center.lat),
        config.zoom || 15
      );
    }

    setMapInstance(map);
    events?.onMapLoad?.(map);
    setIsInitialized(true); // 标记初始化完成
    // 瓦片加载事件
    map.addEventListener('tilesloaded', onTilesLoaded);
    return () => {
      mapInstance?.removeEventListener('tilesloaded', onTilesLoaded);
    };
  }, []);

  // 动态切换主题
  useEffect(() => {
    if (mapInstance) {
      // mapInstance.setMapStyleV2({
      //   styleId:
      //     theme === 'dark'
      //       ? 'fef1c39c1f296afc207e545b60f5c60c'
      //       : 'e7a919669a710ab7163305484c4f3dc4'
      // });
    }
  }, [mapInstance, theme]);

  const setCenterAndZoom = (
    point: { lng: number; lat: number } | [number, number],
    zoom?: number
  ) => {
    if (mapInstance) {
      const [lng, lat] = Array.isArray(point) ? point : [point.lng, point.lat];
      let zoomValue = zoom;
      if (!zoomValue) {
        zoomValue = mapInstance.getZoom();
      }
      mapInstance.centerAndZoom(new window.BMapGL.Point(lng, lat), zoomValue);
    }
  };

  const flyTo = (
    point: { lng: number; lat: number } | [number, number],
    options?: {
      offset?: [number, number];
      zoom?: number;
    }
  ) => {
    if (mapInstance) {
      const [lng, lat] = Array.isArray(point) ? point : [point.lng, point.lat];
      const pointObj = new window.BMapGL.Point(lng, lat);
      const pixel = mapInstance.pointToPixel(pointObj);
      if (options?.offset) {
        pixel.x += options.offset[1] || 0;
        pixel.y += options.offset[0] || 0;
      }
      const pixelObj = mapInstance.pixelToPoint(pixel);
      mapInstance.flyTo(pixelObj, options?.zoom || mapInstance.getZoom());
    }
  };
  return {
    mapRef,
    isLoadingTiles,
    mapInstance,
    isInitialized,
    setCenterAndZoom,
    flyTo
  };
};
