'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import maplibreGl from 'maplibre-gl';
import { useTheme } from 'next-themes';
import { AnimatePresence, motion } from 'motion/react';
import { bbox, featureCollection, point as turfPoint } from '@turf/turf';

import { useMapBase, getRegionBounds } from '@/components/Map';
import { FootprintDot } from './FootprintDot';
import { CityMarker } from './CityMarker';

/** 按城市聚合后的点位 */
export interface CityGroup {
  city: string;
  /** 该城市涉及的区县级 adcode 集合 */
  adcodes: string[];
  points: [number, number][];
  /** 点位的算术中心，用于放置城市汇总标记 */
  center: [number, number];
  count: number;
}

/** 视野切换的动效时长（毫秒） */
const FLY_DURATION = 1400;
/** 只有一个点位时的缩放级别，此时无法构成边界框 */
const SINGLE_POINT_ZOOM = 11;
/** 按点位取景时的缩放上限，避免点位密集时贴到最大级别 */
const MAX_FIT_ZOOM = 13;
/** 点位逐个进场的间隔（秒） */
const DOT_STAGGER = 0.03;
/** 城市标记逐个进场的间隔（秒） */
const CITY_STAGGER = 0.07;
/** 视为窄屏的容器宽度阈值 */
const NARROW_WIDTH = 768;
/** 桌面端右侧为城市面板预留的宽度（面板宽 260 + 外边距 + 余量） */
const PANEL_RESERVE = 300;
/** 换装遮罩的兜底放行时长（毫秒），防止 idle 未触发导致遮罩长留 */
const RESTYLE_TIMEOUT = 3000;

/**
 * 取景留白。
 * 右侧预留城市面板的宽度，使地图内容整体偏向左侧、不被面板压住；
 * 窄屏下面板占屏过大，额外预留反而会把内容压得过小，故只留少量。
 */
function getFitPadding(map: maplibreGl.Map): maplibreGl.PaddingOptions {
  const isNarrow = map.getContainer().clientWidth < NARROW_WIDTH;

  return {
    top: 32,
    bottom: 32,
    left: isNarrow ? 24 : 48,
    right: isNarrow ? 32 : PANEL_RESERVE
  };
}

/** adcode 缺失时的退路：按点位边界取景 */
function fitToPoints(map: maplibreGl.Map, points: [number, number][]) {
  if (points.length === 0) return;

  if (points.length === 1) {
    map.flyTo({
      center: points[0],
      zoom: SINGLE_POINT_ZOOM,
      duration: FLY_DURATION,
      padding: getFitPadding(map)
    });
    return;
  }

  const bounds = bbox(featureCollection(points.map((p) => turfPoint(p))));
  map.fitBounds(
    [
      [bounds[0], bounds[1]],
      [bounds[2], bounds[3]]
    ],
    {
      padding: getFitPadding(map),
      duration: FLY_DURATION,
      maxZoom: MAX_FIT_ZOOM
    }
  );
}

interface FootprintMapProps {
  cities: CityGroup[];
  /** 当前聚焦的城市，null 表示全部 */
  activeCity: string | null;
  /** 点击地图上的城市标记 */
  onSelectCity: (city: string) => void;
}

/**
 * 首页足迹地图。
 * 手势全部禁用，只作展示；视野按整片行政区取景，但不绘制区域高亮图层。
 * 全局视图下每座城市显示一个带数量的汇总标记，聚焦某城后才展开其独立点位，
 * 以此避免同城点位叠成一团。
 */
export function FootprintMap({
  cities,
  activeCity,
  onSelectCity
}: FootprintMapProps) {
  // interactive: false 一次性关闭拖拽/缩放/旋转，程序化的相机调用不受影响
  const { mapRef, mapInstance } = useMapBase({
    config: { interactive: false, zoom: 4 }
  });

  const { resolvedTheme } = useTheme();
  const [isRestyling, setIsRestyling] = useState(false);
  const hasSettledRef = useRef(false);

  const activeGroup = activeCity
    ? cities.find((group) => group.city === activeCity)
    : null;

  // 汇总标记的尺寸按点位数在最大值内归一
  const maxCount = useMemo(
    () => cities.reduce((max, group) => Math.max(max, group.count), 1),
    [cities]
  );

  // 隐藏底图的全部文字标注，只留地形与路网轮廓，使地图更接近图形背景
  useEffect(() => {
    if (!mapInstance) return;

    const hideLabels = () => {
      const style = mapInstance.getStyle();
      if (!style?.layers) return;

      style.layers.forEach((layer) => {
        // symbol 图层承载地名、路名与 POI 图标
        if (layer.type === 'symbol') {
          mapInstance.setLayoutProperty(layer.id, 'visibility', 'none');
        }
      });
    };

    hideLabels();
    // 主题切换会重建样式，需要重新隐藏
    mapInstance.on('style.load', hideLabels);
    return () => {
      mapInstance.off('style.load', hideLabels);
    };
  }, [mapInstance]);

  // 视野：以整片行政区的范围取景，比点位包围盒更贴合「一座城市」
  useEffect(() => {
    if (!mapInstance) return;

    const target = activeCity
      ? cities.find((group) => group.city === activeCity)
      : null;
    const adcodes = target
      ? target.adcodes
      : cities.flatMap((group) => group.adcodes);
    const points = target
      ? target.points
      : cities.flatMap((group) => group.points);

    let cancelled = false;

    const apply = async () => {
      const bounds = await getRegionBounds(adcodes);
      // 城市在异步期间被切换时丢弃本次结果，避免视野被旧请求拽回
      if (cancelled) return;

      if (!bounds) {
        fitToPoints(mapInstance, points);
        return;
      }

      mapInstance.fitBounds(
        [
          [bounds[0], bounds[1]],
          [bounds[2], bounds[3]]
        ],
        {
          padding: getFitPadding(mapInstance),
          duration: FLY_DURATION,
          maxZoom: MAX_FIT_ZOOM
        }
      );
    };

    apply();

    return () => {
      cancelled = true;
    };
  }, [mapInstance, activeCity, cities]);

  /**
   * 主题切换时遮住地图。
   * setStyle 会重新拉取样式与瓦片，中途会依次露出旧样式、空白底、
   * 逐块显现的新瓦片；隐藏地名也要等到 style.load 之后才能执行。
   * 这里在切换期间盖一层同色遮罩，等 idle（新样式渲染完毕）再淡出。
   */
  useEffect(() => {
    if (!mapInstance) return;

    // 地图首次就绪时样式已加载完成，无需遮罩
    if (!hasSettledRef.current) {
      hasSettledRef.current = true;
      return;
    }

    setIsRestyling(true);

    const reveal = () => setIsRestyling(false);
    mapInstance.once('idle', reveal);
    const timer = setTimeout(reveal, RESTYLE_TIMEOUT);

    return () => {
      clearTimeout(timer);
      mapInstance.off('idle', reveal);
    };
  }, [resolvedTheme, mapInstance]);

  return (
    // 地理信息已由城市列表以文本形式提供，故对辅助技术隐藏这团 canvas
    <div ref={mapRef} aria-hidden className="relative h-full w-full">
      {/* 城市汇总标记：聚焦某城时该城的标记让位给展开的点位 */}
      {mapInstance &&
        cities
          .filter((group) => group.city !== activeCity)
          .map((group, index) => (
            <CityMarker
              key={group.city}
              map={mapInstance}
              center={group.center}
              city={group.city}
              count={group.count}
              weight={group.count / maxCount}
              isDimmed={Boolean(activeCity)}
              onClick={() => onSelectCity(group.city)}
              delay={index * CITY_STAGGER}
            />
          ))}

      {/* 聚焦城市的独立点位 */}
      {mapInstance &&
        activeGroup?.points.map((coordinates, index) => (
          <FootprintDot
            key={`${activeGroup.city}-${index}`}
            map={mapInstance}
            point={coordinates}
            isActive
            isPulsing
            delay={index * DOT_STAGGER}
          />
        ))}

      {/* 换装遮罩：即时出现、渲染完成后淡出，因此不做淡入 */}
      <AnimatePresence>
        {isRestyling && (
          <motion.div
            key="restyling"
            className="absolute inset-0 z-20 bg-lab-ink"
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
