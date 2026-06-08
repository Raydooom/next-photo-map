'use client';

import clsx from 'clsx';
import { MapPin, LandPlot } from 'lucide-react';

export type FootprintMode = 'point' | 'region';

interface MapModeSwitchProps {
  mode: FootprintMode;
  onChange: (mode: FootprintMode) => void;
  className?: string;
}

const MODES: {
  key: FootprintMode;
  label: string;
  icon: typeof MapPin;
}[] = [
  { key: 'point', label: '点位足迹', icon: MapPin },
  { key: 'region', label: '区域足迹', icon: LandPlot }
];

/**
 * 地图模式切换控件（类似高德地图卫星/交通图层切换的交互）
 */
export const MapModeSwitch = ({
  mode,
  onChange,
  className
}: MapModeSwitchProps) => {
  return (
    <div
      className={clsx(
        'flex gap-1 p-1 rounded-2xl bg-background/60 backdrop-blur-button border-glass shadow-xl',
        className
      )}
    >
      {MODES.map((item) => {
        const isActive = mode === item.key;
        const Icon = item.icon;
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => onChange(item.key)}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm transition-all duration-200',
              isActive
                ? 'bg-primary text-white font-medium shadow-md'
                : 'text-default-500 hover:text-main hover:bg-background/40'
            )}
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span className="whitespace-nowrap">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
};
