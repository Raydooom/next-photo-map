import { useCallback, useEffect, useRef } from 'react';
import maplibreGl from 'maplibre-gl';
import { bbox, featureCollection } from '@turf/turf';

const SOURCE_ID = 'china-cities';
const FILL_LAYER_ID = 'city-highlights';
const OUTLINE_LAYER_ID = 'city-outline';
const GEOJSON_URL = '/data/china_area_bound.json';

// 缓存清洗后的 GeoJSON，避免重复请求与解析
let geojsonCache: GeoJSON.FeatureCollection | null = null;

async function loadAreaGeoJson(): Promise<GeoJSON.FeatureCollection> {
  if (geojsonCache) return geojsonCache;

  const response = await fetch(GEOJSON_URL);
  const geojson = await response.json();

  // 核心转换逻辑：处理天地图的 gb 字段，统一为 adcode
  geojsonCache = {
    ...geojson,
    features: geojson.features.map((f: any) => ({
      ...f,
      properties: {
        ...f.properties,
        adcode: f.properties.gb?.slice(-6) || f.properties.adcode
      }
    }))
  };

  return geojsonCache!;
}

interface DrawRegionsOptions {
  /** 是否自动缩放到区域范围 */
  fitBounds?: boolean;
  /** fitBounds 的边距 */
  padding?: maplibreGl.PaddingOptions;
}

/**
 * 在地图上绘制行政区域高亮（填充 + 描边）
 * @param map 地图实例
 * @param adcodes 需要高亮的区域 adcode 列表
 * @param options 绘制选项
 */
export async function drawRegions(
  map: maplibreGl.Map,
  adcodes: (string | number)[],
  options: DrawRegionsOptions = {}
) {
  if (!map || !map.isStyleLoaded()) return;

  const { fitBounds = true, padding } = options;
  const codes = new Set(adcodes.map((c) => String(c)));
  const codeArr = Array.from(codes);

  const processedGeoJson = await loadAreaGeoJson();

  // 自动缩放到访问过的区域范围
  if (fitBounds) {
    const visitedFeatures = processedGeoJson.features.filter((f: any) =>
      codes.has(f.properties.adcode)
    );
    if (visitedFeatures.length > 0) {
      const collection = featureCollection(visitedFeatures as any);
      const bounds = bbox(collection);
      map.fitBounds(
        [
          [bounds[0], bounds[1]],
          [bounds[2], bounds[3]]
        ],
        { padding: padding ?? { top: 20, bottom: 120, left: 20, right: 20 } }
      );
    }
  }

  // 数据源
  if (!map.getSource(SOURCE_ID)) {
    map.addSource(SOURCE_ID, {
      type: 'geojson',
      data: processedGeoJson
    });
  }

  // 读取主题色 --primary
  const rootStyles = getComputedStyle(document.documentElement);
  const primaryColor = rootStyles.getPropertyValue('--primary').trim();

  // 填充图层
  if (!map.getLayer(FILL_LAYER_ID)) {
    map.addLayer({
      id: FILL_LAYER_ID,
      type: 'fill',
      source: SOURCE_ID,
      paint: {
        'fill-color': `rgb(${primaryColor})`,
        'fill-opacity': 0.2
      },
      filter: ['in', ['get', 'adcode'], ['literal', codeArr]]
    });
  } else {
    map.setFilter(FILL_LAYER_ID, [
      'in',
      ['get', 'adcode'],
      ['literal', codeArr]
    ]);
  }

  // 描边图层
  if (!map.getLayer(OUTLINE_LAYER_ID)) {
    map.addLayer({
      id: OUTLINE_LAYER_ID,
      type: 'line',
      source: SOURCE_ID,
      paint: {
        'line-color': `rgb(${primaryColor})`,
        'line-width': 1
      },
      filter: ['in', ['get', 'adcode'], ['literal', codeArr]]
    });
  } else {
    map.setFilter(OUTLINE_LAYER_ID, [
      'in',
      ['get', 'adcode'],
      ['literal', codeArr]
    ]);
  }
}

/** 移除区域图层与数据源 */
export function removeRegions(map: maplibreGl.Map) {
  if (!map || !map.getStyle()) return;
  if (map.getLayer(FILL_LAYER_ID)) map.removeLayer(FILL_LAYER_ID);
  if (map.getLayer(OUTLINE_LAYER_ID)) map.removeLayer(OUTLINE_LAYER_ID);
  if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
}

/** 切换区域图层显隐 */
export function setRegionsVisible(map: maplibreGl.Map, visible: boolean) {
  if (!map || !map.getStyle()) return;
  const visibility = visible ? 'visible' : 'none';
  if (map.getLayer(FILL_LAYER_ID)) {
    map.setLayoutProperty(FILL_LAYER_ID, 'visibility', visibility);
  }
  if (map.getLayer(OUTLINE_LAYER_ID)) {
    map.setLayoutProperty(OUTLINE_LAYER_ID, 'visibility', visibility);
  }
}

/** 区域统计信息：城市 + 照片数量 */
export interface RegionStat {
  city: string;
  count: number;
}

/** 构建区域气泡弹窗的 HTML 内容 */
function buildPopupHtml(title: string, count: number): string {
  return `
    <div style="
      padding: 8px 12px;
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 80px;
    ">
      <span style="font-size: 14px; font-weight: 600; line-height: 1.2;">${title}</span>
      <span style="font-size: 12px; opacity: 0.7;">${count} 张照片</span>
    </div>
  `;
}

interface UseRegionLayerOptions {
  /** 是否启用（绘制）区域图层 */
  enabled: boolean;
  /** 区域 adcode -> 统计信息映射（key 即需要高亮的区域） */
  regionStats: Record<string, RegionStat>;
  /** 启用时是否自动缩放到区域范围 */
  fitBounds?: boolean;
  /** fitBounds 的边距 */
  padding?: maplibreGl.PaddingOptions;
}

/**
 * 区域高亮图层 Hook
 * 负责在样式加载后绘制区域、响应 enabled / regionStats 变化，
 * 并支持点击区域在点击位置弹出 城市 + 区域名称 + 照片数量。
 */
export function useRegionLayer(
  map: maplibreGl.Map | null,
  { enabled, regionStats, fitBounds = true, padding }: UseRegionLayerOptions
) {
  // 用 ref 保存最新参数，供事件回调 / style.load 回调读取
  const statsRef = useRef(regionStats);
  const enabledRef = useRef(enabled);
  statsRef.current = regionStats;
  enabledRef.current = enabled;

  // 当前弹窗实例
  const popupRef = useRef<maplibreGl.Popup | null>(null);

  const adcodes = Object.keys(regionStats);

  const apply = useCallback(() => {
    if (!map) return;
    if (enabledRef.current) {
      drawRegions(map, Object.keys(statsRef.current), { fitBounds, padding });
    } else {
      setRegionsVisible(map, false);
    }
  }, [map, fitBounds, padding]);

  // enabled / regionStats 变化时应用
  useEffect(() => {
    if (!map || !map.isStyleLoaded()) return;
    if (enabled) {
      drawRegions(map, Object.keys(regionStats), { fitBounds, padding });
      setRegionsVisible(map, true);
    } else {
      setRegionsVisible(map, false);
      // 关闭模式时移除弹窗
      popupRef.current?.remove();
      popupRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, enabled, regionStats]);

  // 样式切换（主题切换）后，图层会被清空，需要重绘
  useEffect(() => {
    if (!map) return;
    const handleStyleLoad = () => {
      map.once('idle', apply);
    };
    map.on('style.load', handleStyleLoad);
    return () => {
      map.off('style.load', handleStyleLoad);
    };
  }, [map, apply]);

  // 点击区域：在点击位置弹出 区域名称 + 照片数量
  useEffect(() => {
    if (!map) return;

    const handleClick = (
      e: maplibreGl.MapMouseEvent & {
        features?: maplibreGl.MapGeoJSONFeature[];
      }
    ) => {
      if (!enabledRef.current) return;
      const feature = e.features?.[0];
      if (!feature) return;

      const props = feature.properties || {};
      const adcode = String(props.adcode ?? '');
      const name = String(props.name ?? '未知区域');
      const stat = statsRef.current[adcode];
      const count = stat?.count ?? 0;
      // 区域名称前拼接城市（城市与区名相同时不重复显示）
      const city = stat?.city ?? '';
      const title = city && city !== name ? `${city} · ${name}` : name;

      // 复用同一个 Popup 实例
      popupRef.current?.remove();
      popupRef.current = new maplibreGl.Popup({
        closeButton: false,
        closeOnClick: true,
        offset: 12,
        className: 'region-popup'
      })
        .setLngLat(e.lngLat)
        .setHTML(buildPopupHtml(title, count))
        .addTo(map);
    };

    const handleEnter = () => {
      if (enabledRef.current) map.getCanvas().style.cursor = 'pointer';
    };
    const handleLeave = () => {
      map.getCanvas().style.cursor = '';
    };

    map.on('click', FILL_LAYER_ID, handleClick);
    map.on('mouseenter', FILL_LAYER_ID, handleEnter);
    map.on('mouseleave', FILL_LAYER_ID, handleLeave);

    return () => {
      map.off('click', FILL_LAYER_ID, handleClick);
      map.off('mouseenter', FILL_LAYER_ID, handleEnter);
      map.off('mouseleave', FILL_LAYER_ID, handleLeave);
    };
  }, [map]);

  return { adcodes };
}
