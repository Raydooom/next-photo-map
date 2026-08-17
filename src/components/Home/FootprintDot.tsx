'use client';

import { useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import maplibreGl from 'maplibre-gl';
import { motion } from 'motion/react';
import clsx from 'clsx';

interface FootprintDotProps {
  map: maplibreGl.Map;
  point: [number, number];
  /** 高亮态：所属城市被选中，或当前未选中任何城市 */
  isActive: boolean;
  /** 是否播放脉冲。与 isActive 分开，使全局视图下不出现满屏闪烁 */
  isPulsing?: boolean;
  /** 进场延迟（秒） */
  delay?: number;
}

/**
 * 地图点位标记。
 * 沿用项目既有的 maplibre Marker + createPortal 模式：位置更新交给 maplibre
 * 的渲染循环，DOM 与动画交给 React。
 * 用 Marker 而非 GeoJSON 图层，好处是主题切换清空图层时标记不受影响。
 */
export function FootprintDot({
  map,
  point,
  isActive,
  isPulsing = false,
  delay = 0
}: FootprintDotProps) {
  const container = useMemo(() => document.createElement('div'), []);
  const markerRef = useRef<maplibreGl.Marker | null>(null);

  useEffect(() => {
    const marker = new maplibreGl.Marker({
      element: container,
      anchor: 'center'
    })
      .setLngLat(point)
      .addTo(map);

    markerRef.current = marker;

    return () => {
      marker.remove();
      markerRef.current = null;
    };
    // 位置变化由下一个 effect 单独同步，此处只负责挂载与销毁
  }, [map, container]);

  useEffect(() => {
    markerRef.current?.setLngLat(point);
  }, [point]);

  return createPortal(
    <motion.span
      className="relative flex h-4 w-4 items-center justify-center"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 22, delay }}
    >
      {/* 脉冲环仅在聚焦某座城市时出现，避免全图点位一起闪烁 */}
      {isPulsing && (
        <span className="absolute h-full w-full animate-ping rounded-full bg-lab-accent/60" />
      )}

      {/* 描边环取页面底色而非同色：底图明暗不定，
          用对比色环把圆点从地形与路网上分离出来 */}
      <span
        className={clsx(
          'relative rounded-full transition-all duration-300',
          isActive
            ? 'h-2.5 w-2.5 bg-lab-accent ring-2 ring-lab-ink'
            : 'h-1.5 w-1.5 bg-lab-muted ring-1 ring-lab-ink'
        )}
      />
    </motion.span>,
    container
  );
}
