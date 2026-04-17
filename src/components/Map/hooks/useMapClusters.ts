import { useCallback, useEffect, useRef, useState } from 'react';
import maplibreGl from 'maplibre-gl';

export const useMapClusters = (
  map: maplibreGl.Map,
  config?: { clusterMaxZoom?: number; clusterRadius?: number }
) => {
  // 存储从 WebGL 影子层抓取出来的实时聚合数据
  const [clusters, setClusters] = useState<any[]>([]);
  // 使用 Ref 记录当前的标记点，防止切换主题时数据丢失
  const featuresRef = useRef<GeoJSON.Feature[]>([]);

  // 从透明图层抓取聚合点数据
  const syncClusters = useCallback(() => {
    if (
      !map ||
      !map.isStyleLoaded() ||
      !map.getLayer('clusters-hidden-sensor')
    ) {
      return;
    }
    // 查询不可见的聚合图层，获取实时聚合数据
    const features = map.queryRenderedFeatures({
      layers: ['clusters-hidden-sensor']
    });

    const uniqueMap = new Map();

    features.forEach(f => {
      const data = JSON.parse(f.properties?.data || '{}');

      // 为聚合点和单点生成不同的前缀，防止 ID 碰撞
      const featId = f.properties?.cluster
        ? `cluster-${f.id}`
        : `point-${data?.point[0]}-${data?.point[1]}`;

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
  }, [map]);

  // 添加聚合图层的函数
  const initClusterLayers = useCallback(
    (map: maplibreGl.Map) => {
      if (!map || !map.isStyleLoaded()) return;

      if (!map.getSource('markers')) {
        map.addSource('markers', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: featuresRef.current
          },
          cluster: true,
          clusterMaxZoom: config?.clusterMaxZoom || 17,
          clusterRadius: config?.clusterRadius || 50
        });
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
      map.off('move', syncClusters); // 先解绑，防重绑定
      map.on('move', syncClusters);
      map.once('idle', syncClusters);
    },
    [syncClusters]
  );

  useEffect(() => {
    if (!map) return;
    const handleStyleLoad = () => {
      // idle 保证了所有图层已经注入 WebGL 渲染管线
      map.once('idle', () => {
        initClusterLayers(map);
      });
    };

    // 样式切换，重新初始化聚合图层
    map.on('style.load', handleStyleLoad);
    return () => {
      map.off('style.load', handleStyleLoad);
    };
  }, [map, initClusterLayers]);

  const updateMarkers = useCallback(
    (features: GeoJSON.Feature[]) => {
      featuresRef.current = features;
      if (!map) return;
      const source = map.getSource('markers') as maplibreGl.GeoJSONSource;

      if (!source) {
        // 只有在没有 Source 的时候才去初始化图层
        // 此时 initClusterLayers 会读取上面刚更新的 featuresRef.current
        initClusterLayers(map);
      } else {
        // 3. 【最重要】如果 Source 已存在，必须调用 setData 同步给 WebGL
        source.setData({
          type: 'FeatureCollection',
          features: features
        });

        // 4. 数据设置后，等待数据源加载完成（计算完聚合）再抓取
        map.once('idle', () => {
          syncClusters();
        });
      }
    },
    [map, initClusterLayers, syncClusters]
  );
  return {
    clusters,
    syncClusters,
    updateMarkers
  };
};
