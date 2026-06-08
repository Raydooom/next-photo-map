'use client';

import { useEffect } from 'react';
import { useMapBase, drawRegions } from '../Map';
import { FullscreenIcon } from '../Icons/button';

interface AreaMapProps {
  data?: any[];
  className?: string;
}

export function AreaMap({ data = [] }: AreaMapProps) {
  const { mapRef, mapInstance } = useMapBase({ config: { zoom: 6 } });

  useEffect(() => {
    if (!mapInstance) return;

    const adcodes = data.map((item) => item.adcode);

    const draw = () => {
      // idle 保证了所有图层已经注入 WebGL 渲染管线
      mapInstance.once('idle', () => {
        drawRegions(mapInstance, adcodes);
      });
    };

    // 首次：mapInstance 就绪时样式已加载，直接绘制
    draw();
    // 样式切换（主题切换）后图层被清空，需要重绘
    mapInstance.on('style.load', draw);
    return () => {
      mapInstance.off('style.load', draw);
    };
  }, [data, mapInstance]);

  return (
    <div ref={mapRef} className="w-full h-full">
      <FullscreenIcon
        onClick={() => window.open(`/footprint`, '_blank')}
        className="absolute top-4 right-4 z-10"
      />
    </div>
  );
}
