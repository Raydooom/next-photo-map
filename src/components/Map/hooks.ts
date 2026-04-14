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
    cluster?: boolean;
    clusterMaxZoom?: number;
    clusterRadius?: number;
    interactive?: boolean;
  };
  events?: {
    onMapLoad?: (map: maplibreGl.Map) => void;
  };
}

// 获取环境变量中的默认中心坐标
const DEFAULT_CENTER = process.env
  .NEXT_PUBLIC_MAP_DEFAULT_CENTER!.split(',')
  .map(Number);

export const useMapLibre = ({
  center = { longitude: DEFAULT_CENTER[0], latitude: DEFAULT_CENTER[1] },
  config = {},
  events
}: MapLibreProps = {}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapInstance, setMapInstance] = useState<maplibreGl.Map | null>(null);

  // 存储从 WebGL 影子层抓取出来的实时聚合数据
  const [clusters, setClusters] = useState<any[]>([]);
  // 使用 Ref 记录当前的标记点，防止切换主题时数据丢失
  const featuresRef = useRef<GeoJSON.Feature[]>([]);
  const themeInfo = useTheme();

  // 从透明图层抓取聚合点数据
  const syncClusters = useCallback(() => {
    if (!mapInstance || !config.cluster) return;

    // 查询不可见的聚合图层，获取实时聚合数据
    const features = mapInstance.queryRenderedFeatures({
      layers: ['clusters-hidden-sensor']
    });

    const clusterData = features.map(f => ({
      id: f.id,
      coordinates: (f.geometry as any).coordinates,
      properties: f.properties
    }));

    setClusters(clusterData);
  }, [mapInstance, config.cluster]);

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

  // 添加聚合图层的函数
  const addClusterLayers = useCallback(
    (map: maplibreGl.Map) => {
      if (!config.cluster) return;

      // 如果已存在 Source 则先移除，确保数据刷新
      if (map.getSource('markers')) {
        map.removeSource('markers');
      }

      map.addSource('markers', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: featuresRef.current
        },
        cluster: true,
        clusterMaxZoom: config.clusterMaxZoom || 18,
        clusterRadius: config.clusterRadius || 50
      });

      // 不设置颜色，只用于 queryRenderedFeatures 抓取位置
      if (!map.getLayer('clusters-hidden-sensor')) {
        map.addLayer({
          id: 'clusters-hidden-sensor',
          type: 'circle',
          source: 'markers',
          paint: { 'circle-opacity': 0, 'circle-radius': 25 } // 半径稍微大一点方便抓取
        });
      }

      // 监听地图移动事件，同步聚合图层
      map.on('move', syncClusters);
      map.on('moveend', syncClusters);
      syncClusters();
    },
    [config, syncClusters]
  );

  // 初始化地图
  useEffect(() => {
    if (!mapRef.current || !mapStyle) return;

    const map = new maplibreGl.Map({
      container: mapRef.current,
      style: mapStyle,
      center: [center.longitude, center.latitude],
      zoom: config.zoom || 12,
      attributionControl: false,
      interactive: config.interactive ?? true
    });

    map.on('load', () => {
      replaceChinese(map);
      addClusterLayers(map);
      setMapInstance(map);
      events?.onMapLoad?.(map);
    });

    return () => {
      map.remove();
    };
  }, []);

  // // 处理主题/样式切换
  useEffect(() => {
    if (mapInstance && mapStyle) {
      // 1. 执行切换
      mapInstance.setStyle(mapStyle);

      // 2. 只有 style.load 之后，图层才是“干净且可写”的
      mapInstance.once('style.load', () => {
        replaceChinese(mapInstance);
        addClusterLayers(mapInstance);
        syncClusters();
      });
    }
  }, [mapInstance, mapStyle, replaceChinese, addClusterLayers]);

  const updateMarkers = useCallback(
    (features: GeoJSON.Feature[]) => {
      featuresRef.current = features;
      if (mapInstance) {
        const source = mapInstance.getSource(
          'markers'
        ) as maplibreGl.GeoJSONSource;
        if (source) source.setData({ type: 'FeatureCollection', features });
        syncClusters(); // 数据更新后立即同步一次
      }
    },
    [mapInstance, syncClusters]
  );

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
    clusters,
    setCenterAndZoom,
    flyTo,
    updateMarkers
  };
};
