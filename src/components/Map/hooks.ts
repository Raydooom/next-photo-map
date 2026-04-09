import { useEffect, useMemo, useRef, useState } from 'react';
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

  const themeInfo = useTheme();

  // 计算地图样式
  const mapStyle = useMemo(
    () =>
      themeInfo.theme === 'dark'
        ? process.env.NEXT_PUBLIC_MAP_DARK_STYLE_URL
        : process.env.NEXT_PUBLIC_MAP_BRIGHT_STYLE_URL,
    [themeInfo.theme]
  );

  // 替换中文
  const replaceChinese = () => {
    if (!mapInstance) return;
    const layers = mapInstance.getStyle().layers;
    layers.forEach(layer => {
      // 检查图层是否有文字字段 (Symbol 图层)
      if (
        layer.type === 'symbol' &&
        layer.layout &&
        layer.layout['text-field']
      ) {
        // 动态将 text-field 改为中文逻辑
        mapInstance.setLayoutProperty(layer.id, 'text-field', [
          'coalesce',
          ['get', 'name:zh'], // 优先中文
          ['get', 'name:zh-Hans'], // 备选简体
          ['get', 'name'], // 原始名称
          ['get', 'name:en'] // 最后英文保底
        ]);
      }
    });
  };

  // 添加聚合图层的函数
  const addClusterLayers = (map: maplibregl.Map) => {
    if (!config.cluster) return;

    // 检查数据源是否存在，不存在则添加
    if (!map.getSource('markers')) {
      map.addSource('markers', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: []
        },
        cluster: true,
        clusterMaxZoom: config.clusterMaxZoom || 18,
        clusterRadius: config.clusterRadius || 50
      });
    }

    // 检查图层是否存在，不存在则添加
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
          'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
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
  };

  // 初始化 MapLibre 地图
  useEffect(() => {
    if (!mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapRef.current,
      style: mapStyle,
      center: center ? [center.longitude, center.latitude] : [116.404, 39.915],
      zoom: config.zoom || 12,
      attributionControl: false
    });
    map.on('load', () => {
      replaceChinese();
      // 添加聚合图层
      addClusterLayers(map);

      setMapInstance(map);
      setIsInitialized(true);
      events?.onMapLoad?.(map);
    });

    return () => {
      map.remove();
    };
  }, []);

  // 监听主题变化，更新地图样式并重新添加聚合点
  useEffect(() => {
    if (mapInstance && mapStyle) {
      // 设置新样式
      mapInstance.setStyle(mapStyle);
      
      // 监听样式加载完成事件，重新添加聚合点
      mapInstance.once('style.load', () => {
        replaceChinese();
        // 重新添加聚合图层
        addClusterLayers(mapInstance);
      });
    }
  }, [mapInstance, mapStyle]);

  // 设置地图中心和缩放级别
  const setCenterAndZoom = (point: MarkerPoint, zoom?: number) => {
    if (mapInstance) {
      mapInstance.setCenter([point.longitude, point.latitude]);
      if (zoom) {
        mapInstance.setZoom(zoom);
      }
    }
  };

  // 平滑移动到指定位置
  const flyTo = (point: MarkerPoint, options?: { zoom?: number }) => {
    if (mapInstance) {
      mapInstance.flyTo({
        center: [point.longitude, point.latitude],
        zoom: options?.zoom || mapInstance.getZoom(),
        duration: 1000
      });
    }
  };

  // 更新地图数据
  const updateMarkers = (features: GeoJSON.Feature[]) => {
    if (mapInstance) {
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

  return {
    mapRef,
    mapInstance,
    isInitialized,
    setCenterAndZoom,
    flyTo,
    updateMarkers
  };
};
