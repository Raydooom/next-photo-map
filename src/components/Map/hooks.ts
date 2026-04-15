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
  .map(Number) as MarkerPoint;

export const useMapLibre = ({
  center = DEFAULT_CENTER,
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

  // 从透明图层抓取聚合点数据
  const syncClusters = useCallback(() => {
    if (!mapInstance || !config.cluster || !mapInstance.isStyleLoaded()) return;

    // 查询不可见的聚合图层，获取实时聚合数据
    const features = mapInstance.queryRenderedFeatures({
      layers: ['clusters-hidden-sensor']
    });

    const uniqueMap = new Map();

    features.forEach(f => {
      const data = JSON.parse(f.properties?.data || '{}');

      // 为聚合点和单点生成不同的前缀，防止 ID 碰撞
      const featId = f.properties?.cluster
        ? `cluster-${f.id}`
        : `point-${data?.point?.latitude}-${data?.point?.longitude}`;

      if (!uniqueMap.has(featId)) {
        uniqueMap.set(featId, {
          renderKey: featId, // 显式存储渲染 Key
          id: f.id,
          coordinates: (f.geometry as any).coordinates,
          properties: f.properties
        });
      }
    });

    setClusters(Array.from(uniqueMap.values()));
  }, [mapInstance, config.cluster]);

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

      // 【影子图层】不设置颜色，只用于 queryRenderedFeatures 抓取位置
      if (map.getLayer('clusters-hidden-sensor')) {
        map.removeLayer('clusters-hidden-sensor');
      }
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
      map.on('idle', syncClusters);
    },
    [config, syncClusters]
  );

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
        addClusterLayers(mapInstance);
      });
    }
  }, [mapInstance, mapStyle, replaceChinese, addClusterLayers, syncClusters]);

  const updateMarkers = useCallback(
    (features: GeoJSON.Feature[]) => {
      featuresRef.current = features;
      if (!mapInstance || !mapInstance.isStyleLoaded()) return;

      const source = mapInstance.getSource(
        'markers'
      ) as maplibreGl.GeoJSONSource;

      if (!source) {
        // 如果样式刚加载完 Source 还没建，先建 Source
        addClusterLayers(mapInstance);
      } else {
        // 如果 Source 已存在，注入数据并等待
        const onDataLoad = (e: any) => {
          // 监听 source 数据加载完成
          if (e.sourceId === 'markers' && e.dataType === 'source') {
            // 给 WebGL 渲染一帧的时间，确保 queryRenderedFeatures 能抓到
            syncClusters();
          }
        };
        mapInstance.on('data', onDataLoad);
        source.setData({ type: 'FeatureCollection', features });
      }
    },
    [mapInstance, addClusterLayers, syncClusters]
  );

  const setCenterAndZoom = (point: MarkerPoint, zoom?: number) => {
    if (mapInstance) {
      mapInstance.setCenter(point);
      if (zoom) mapInstance.setZoom(zoom);
    }
  };

  const flyTo = (
    point: MarkerPoint,
    options?: { zoom?: number; duration?: number }
  ) => {
    if (mapInstance) {
      mapInstance.flyTo({
        center: point,
        zoom: options?.zoom || mapInstance.getZoom(),
        duration: options?.duration || 1000
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
