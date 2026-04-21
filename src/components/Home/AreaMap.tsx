'use client';

import { useEffect } from 'react';
import { bbox, featureCollection } from '@turf/turf';
import { useMapBase } from '../Map';
import { FullscreenIcon } from '../Icons/button';

interface AreaMapProps {
  data?: any[];
  className?: string;
}

export function AreaMap({ data = [] }: AreaMapProps) {
  const { mapRef, mapInstance } = useMapBase({ config: { zoom: 6 } });
  useEffect(() => {
    if (!mapInstance) return;
    const codes = new Set(data.map(item => String(item.adcode)));
    const handleStyleLoad = () => {
      // idle 保证了所有图层已经注入 WebGL 渲染管线
      mapInstance.once('idle', async () => {
        // 2. 加载并清洗 GeoJSON 数据
        const response = await fetch('/data/china_area_bound.json');
        const geojson = await response.json();

        // 核心转换逻辑：处理天地图的 gb 字段
        const processedGeoJson = {
          ...geojson,
          features: geojson.features.map((f: any) => ({
            ...f,
            properties: {
              ...f.properties,
              adcode: f.properties.gb?.slice(-6) || f.properties.adcode
            }
          }))
        };
        const visitedFeatures = processedGeoJson.features.filter((f: any) =>
          codes.has(f.properties.adcode)
        );
        const collection = featureCollection(visitedFeatures);
        const bounds = bbox(collection);

        mapInstance.fitBounds(
          [
            [bounds[0], bounds[1]], // 西南角
            [bounds[2], bounds[3]] // 东北角
          ],
          { padding: { top: 20, bottom: 120, left: 20, right: 20 } }
        );

        const source = mapInstance.getSource('china-cities');
        if (!source) {
          // 1. 添加 GeoJSON 数据源 (指向 public 目录)
          mapInstance.addSource('china-cities', {
            type: 'geojson',
            data: processedGeoJson
          });
        }

        // 1. 获取根节点（:root）的样式对象
        const rootStyles = getComputedStyle(document.documentElement);
        // 2. 读取具体的变量值（注意：必须包含双横线 '--'）
        const primaryColor = rootStyles.getPropertyValue('--primary').trim();

        const highlightLayer = mapInstance.getLayer('city-highlights');
        if (!highlightLayer) {
          // 2. 添加填充图层 (默认全部透明)
          mapInstance?.addLayer({
            id: 'city-highlights',
            type: 'fill',
            source: 'china-cities',
            paint: {
              'fill-color': `rgb(${primaryColor})`, // 使用你的 --primary 颜色
              'fill-opacity': 0.2
            },
            // 核心：初始过滤，只显示数据库中存在的城市
            filter: ['in', ['get', 'adcode'], ['literal', Array.from(codes)]]
          });
        }

        // 3. 添加描边层
        const outlineLayer = mapInstance.getLayer('city-outline');
        if (!outlineLayer) {
          mapInstance?.addLayer({
            id: 'city-outline',
            type: 'line',
            source: 'china-cities',
            paint: {
              'line-color': `rgb(${primaryColor})`,
              'line-width': 1
            },
            filter: ['in', ['get', 'adcode'], ['literal', Array.from(codes)]]
          });
        }
      });
    };

    // 样式切换，重新初始化聚合图层
    mapInstance.on('style.load', handleStyleLoad);

    return () => mapInstance?.remove();
  }, [data, mapInstance]); // 当数据库数据更新时，重新触发过滤

  return (
    <div ref={mapRef} className="w-full h-full">
      <FullscreenIcon
        onClick={() => window.open(`/footprint`, '_blank')}
        className="absolute top-4 right-4 z-10"
      />
    </div>
  );
}
