import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useTheme } from 'next-themes';
import maplibreGl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { MarkerPoint } from '@/types/mapMarker';

interface MapLibreProps {
  center?: MarkerPoint;
  config?: {
    style?: string;
    zoom?: number;
    interactive?: boolean;
  };
  events?: {
    onMapLoad?: (map: maplibreGl.Map) => void;
    onStyleChange?: (map: maplibreGl.Map) => void;
  };
}

// 获取环境变量中的默认中心坐标
const DEFAULT_CENTER = process.env
  .NEXT_PUBLIC_MAP_DEFAULT_CENTER!.split(',')
  .map(Number) as MarkerPoint;

export const useMapBase = ({
  center = DEFAULT_CENTER,
  config = {},
  events
}: MapLibreProps = {}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapInstance, setMapInstance] = useState<maplibreGl.Map | null>(null);

  const themeInfo = useTheme();
  const mapStyle = useMemo(
    () =>
      themeInfo.theme === 'dark'
        ? process.env.NEXT_PUBLIC_MAP_DARK_STYLE_URL
        : process.env.NEXT_PUBLIC_MAP_BRIGHT_STYLE_URL,
    [themeInfo.theme]
  );

  // 替换中文
  const replaceChinese = useCallback((map: maplibreGl.Map) => {
    const style = map.getStyle();
    if (!style) return;

    style.layers.forEach(layer => {
      if (
        layer.type === 'symbol' &&
        layer.layout &&
        layer.layout['text-field']
      ) {
        map.setLayoutProperty(layer.id, 'text-field', [
          'coalesce',
          ['get', 'name:zh'],
          ['get', 'name:zh-Hans'],
          ['get', 'name'],
          ['get', 'name:en']
        ]);
      }
    });
  }, []);

  // 初始化地图
  useEffect(() => {
    if (!mapRef.current || !mapStyle) return;

    const map = new maplibreGl.Map({
      container: mapRef.current,
      style: mapStyle,
      center,
      zoom: config.zoom || 12,
      attributionControl: false,
      interactive: config.interactive ?? true
    });

    map.on('load', () => {
      replaceChinese(map);
      setMapInstance(map);
      events?.onMapLoad?.(map);
    });

    return () => {
      map.remove();
    };
  }, []);

  // 处理主题/样式切换
  useEffect(() => {
    if (mapInstance && mapStyle) {
      // 1. 执行切换
      mapInstance.setStyle(mapStyle);
      // 2. 只有 style.load 之后，图层才是“干净且可写”的
      mapInstance.once('style.load', () => {
        replaceChinese(mapInstance);
        events?.onStyleChange?.(mapInstance);
      });
    }
  }, [mapInstance, mapStyle, replaceChinese, events]);

  return {
    mapRef,
    mapInstance
  };
};
