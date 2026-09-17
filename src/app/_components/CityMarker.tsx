'use client';

import { useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import maplibreGl from 'maplibre-gl';
import { motion } from 'motion/react';
import clsx from 'clsx';

/** 标记直径区间（像素），按点位数在区间内插值 */
const MIN_SIZE = 30;
const MAX_SIZE = 48;

interface CityMarkerProps {
  map: maplibreGl.Map;
  center: [number, number];
  city: string;
  count: number;
  /** 点位数占全局最大值的比例，用于决定尺寸 */
  weight: number;
  /** 已聚焦到其他城市时降级显示 */
  isDimmed?: boolean;
  onClick: () => void;
  /** 进场延迟（秒） */
  delay?: number;
}

/**
 * 城市汇总标记。
 * 全局视图下用一个带数量的标记代表整座城市，避免同城点位叠成一团、
 * 读不出数量；同时兼作该城市在地图上的身份锚点与点击入口。
 * 地图虽禁用了手势，但标记是 DOM 元素，点击照常可用。
 */
export function CityMarker({
  map,
  center,
  city,
  count,
  weight,
  isDimmed = false,
  onClick,
  delay = 0
}: CityMarkerProps) {
  const container = useMemo(() => document.createElement('div'), []);
  const markerRef = useRef<maplibreGl.Marker | null>(null);

  useEffect(() => {
    const marker = new maplibreGl.Marker({
      element: container,
      anchor: 'center'
    })
      .setLngLat(center)
      .addTo(map);

    markerRef.current = marker;

    return () => {
      marker.remove();
      markerRef.current = null;
    };
  }, [map, container]);

  useEffect(() => {
    markerRef.current?.setLngLat(center);
  }, [center]);

  const size = MIN_SIZE + (MAX_SIZE - MIN_SIZE) * weight;

  return createPortal(
    <motion.button
      type="button"
      onClick={onClick}
      aria-label={`${city}，${count} 个点位`}
      className={clsx(
        'flex cursor-pointer items-center justify-center rounded-full',
        // 描边环取页面底色，使标记从底图上分离
        'bg-lab-accent/85 ring-2 ring-lab-ink backdrop-blur-sm',
        'transition-colors hover:bg-lab-accent',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lab-accent'
      )}
      style={{ width: size, height: size }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: isDimmed ? 0.4 : 1 }}
      transition={{ type: 'spring', stiffness: 280, damping: 20, delay }}
    >
      <span className="lab-mono tabular-nums text-lab-accent-ink">{count}</span>
    </motion.button>,
    container
  );
}
