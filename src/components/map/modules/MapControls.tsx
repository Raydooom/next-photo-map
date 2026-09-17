"use client";

import { Minus, Plus } from "lucide-react";
import maplibregl from "maplibre-gl";
import clsx from "clsx";

interface MapControlsProps {
  mapInstance: maplibregl.Map | null;
  className?: string;
}

/**
 * 地图控件。
 *
 * 只留缩放。原先还有指北针与"定位到我的位置"：地图未开启旋转，
 * 指北针按下去没有可回正的角度；而这是一份影像档案，
 * 观者当前所在的位置与照片拍摄地无关，定位按钮没有去处。
 *
 * 直角、1px 描边、上下两格共用一条分隔线，与页面同一套语言。
 */
export const MapControls = ({ mapInstance, className }: MapControlsProps) => {
  const zoomBy = (delta: number) => {
    if (!mapInstance) return;
    mapInstance.zoomTo(mapInstance.getZoom() + delta, { duration: 300 });
  };

  const buttonClass = clsx(
    "flex h-10 w-10 cursor-pointer items-center justify-center",
    "text-lab-muted transition-colors",
    "hover:bg-lab-sunken hover:text-lab-paper",
    "focus-visible:outline-1 focus-visible:-outline-offset-1 focus-visible:outline-lab-accent",
  );

  return (
    <div
      /**
       * 面板与视图切换器同一套：磨砂底、line-strong 描边、投影托底。
       * 两个控件贴在同一片地图上，只给其中一个做层次会显得一个浮起、
       * 一个沉进去。
       */
      className={clsx(
        "flex flex-col overflow-hidden",
        "border border-lab-line dark:border-lab-line-strong",
        "bg-lab-raised/88 backdrop-blur-md",
        "shadow-[0_2px_6px_rgba(0,0,0,0.16),0_14px_30px_-10px_rgba(0,0,0,0.28)]",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => zoomBy(1)}
        aria-label="放大"
        className={clsx(
          buttonClass,
          "border-b border-lab-line dark:border-lab-line-strong",
        )}
      >
        <Plus className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => zoomBy(-1)}
        aria-label="缩小"
        className={buttonClass}
      >
        <Minus className="h-4 w-4" />
      </button>
    </div>
  );
};
