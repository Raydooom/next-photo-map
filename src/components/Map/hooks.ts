import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useTheme } from 'next-themes';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { MarkerPoint } from '@/types/mapMarker';

interface MapLibreProps {
  center?: MarkerPoint;
  config?: {
    style?: string;
    zoom?: number;
    cluster?: boolean;
    clusterMaxZoom?: number;
    clusterRadius?: number;
  };
  events?: {
    onMapLoad?: (map: maplibregl.Map) => void;
  };
}

export const useMapLibre = ({
  center,
  config = {},
  events
}: MapLibreProps = {}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapInstance, setMapInstance] = useState<maplibregl.Map | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // 【关键】使用 Ref 记录当前的标记点，防止切换主题时数据丢失
  const featuresRef = useRef<GeoJSON.Feature[]>([]);
  const themeInfo = useTheme();

  const mapStyle = useMemo(
    () =>
      themeInfo.theme === 'dark'
        ? process.env.NEXT_PUBLIC_MAP_DARK_STYLE_URL
        : process.env.NEXT_PUBLIC_MAP_BRIGHT_STYLE_URL,
    [themeInfo.theme]
  );

  // 替换中文
  const replaceChinese = useCallback((map: maplibregl.Map) => {
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

  // 添加聚合图层的函数
  const addClusterLayers = useCallback(
    (map: maplibregl.Map) => {
      if (!config.cluster) return;

      // 【修正】setStyle 后旧 source 必死，这里不再做 if 判断，直接 add
      map.addSource('markers', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: featuresRef.current // 立即回填之前存的数据
        },
        cluster: true,
        clusterMaxZoom: config.clusterMaxZoom || 18,
        clusterRadius: config.clusterRadius || 50
      });

      // 图层还是可以判断一下，避免重复添加报错
      if (!map.getLayer('clusters')) {
        map.addLayer({
          id: 'clusters',
          type: 'circle',
          source: 'markers',
          filter: ['has', 'point_count'],
          paint: {
            'circle-color': [
              'step',
              ['get', 'point_count'],
              '#51bbd6',
              100,
              '#f1f075',
              750,
              '#f28cb1'
            ],
            'circle-radius': [
              'step',
              ['get', 'point_count'],
              20,
              100,
              30,
              750,
              40
            ]
          }
        });
      }

      if (!map.getLayer('cluster-count')) {
        map.addLayer({
          id: 'cluster-count',
          type: 'symbol',
          source: 'markers',
          filter: ['has', 'point_count'],
          layout: {
            'text-field': '{point_count_abbreviated}',
            // 确保你的 TileServer 字体库里有这些字体，否则数字会白屏
            'text-font': ['Noto Sans CJK Regular', 'Arial Unicode MS Regular'],
            'text-size': 12
          }
        });
      }

      if (!map.getLayer('unclustered-point')) {
        map.addLayer({
          id: 'unclustered-point',
          type: 'circle',
          source: 'markers',
          filter: ['!', ['has', 'point_count']],
          paint: {
            'circle-color': '#11b4da',
            'circle-radius': 10,
            'circle-stroke-width': 2,
            'circle-stroke-color': '#fff'
          }
        });
      }
    },
    [config]
  );

  // 初始化地图
  useEffect(() => {
    if (!mapRef.current || !mapStyle) return;

    const map = new maplibregl.Map({
      container: mapRef.current,
      style: mapStyle,
      center: center ? [center.longitude, center.latitude] : [116.404, 39.915],
      zoom: config.zoom || 12,
      attributionControl: false
    });

    map.on('load', () => {
      replaceChinese(map);
      addClusterLayers(map);
      setMapInstance(map);
      setIsInitialized(true);
      events?.onMapLoad?.(map);
    });

    return () => {
      map.remove();
    };
  }, []);

  // 处理主题/样式切换
  useEffect(() => {
    if (mapInstance && mapStyle && isInitialized) {
      // 1. 执行切换
      mapInstance.setStyle(mapStyle);

      // 2. 只有 style.load 之后，图层才是“干净且可写”的
      mapInstance.once('style.load', () => {
        replaceChinese(mapInstance);
        addClusterLayers(mapInstance);

        // 3. 补偿性同步数据（确保数据渲染）
        const source = mapInstance.getSource(
          'markers'
        ) as maplibregl.GeoJSONSource;
        if (source) {
          source.setData({
            type: 'FeatureCollection',
            features: featuresRef.current
          });
        }
      });
    }
  }, [mapInstance, mapStyle, isInitialized, replaceChinese, addClusterLayers]);

  // 更新地图数据
  const updateMarkers = (features: GeoJSON.Feature[]) => {
    featuresRef.current = features; // 同步更新 Ref
    if (mapInstance && isInitialized) {
      const source = mapInstance.getSource(
        'markers'
      ) as maplibregl.GeoJSONSource;
      if (source) {
        source.setData({
          type: 'FeatureCollection',
          features
        });
      }
    }
  };

  const setCenterAndZoom = (point: MarkerPoint, zoom?: number) => {
    if (mapInstance) {
      mapInstance.setCenter([point.longitude, point.latitude]);
      if (zoom) mapInstance.setZoom(zoom);
    }
  };

  const flyTo = (point: MarkerPoint, options?: { zoom?: number }) => {
    if (mapInstance) {
      mapInstance.flyTo({
        center: [point.longitude, point.latitude],
        zoom: options?.zoom || mapInstance.getZoom(),
        duration: 1000
      });
    }
  };

  return {
    mapRef,
    mapInstance,
    isInitialized,
    setCenterAndZoom,
    flyTo,
    updateMarkers
  };
};
