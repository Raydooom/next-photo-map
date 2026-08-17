'use client';

import { useState } from 'react';
import clsx from 'clsx';

import { Eyebrow } from '@/components/ui';
import { FootprintMap, type CityGroup } from './FootprintMap';

interface CityRowProps {
  label: string;
  count: number;
  isActive: boolean;
  onClick: () => void;
}

/** 城市列表项。选中态以左侧竖条标示，与右对齐的计数形成两端结构 */
function CityRow({ label, count, isActive, onClick }: CityRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isActive}
      className={clsx(
        'flex min-h-12 w-full cursor-pointer items-center justify-between gap-3 px-2',
        'border-b border-lab-line/40 text-left transition-colors last:border-b-0',
        // 悬停给出底色反馈，使 48px 的点击区域可感知
        'hover:bg-lab-paper/5',
        'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-lab-accent',
        isActive ? 'text-lab-accent' : 'text-lab-muted hover:text-lab-paper'
      )}
    >
      <span className="flex min-w-0 items-center gap-2.5">
        <span
          aria-hidden
          className={clsx(
            'h-3.5 w-[2px] shrink-0 transition-colors',
            isActive ? 'bg-lab-accent' : 'bg-transparent'
          )}
        />
        {/* 城市名含中文，不套 lab-mono 的大写与宽字距 */}
        <span className="truncate text-[13px] [font-variation-settings:'wght'_560]">
          {label}
        </span>
      </span>
      <span className="lab-mono shrink-0 tabular-nums opacity-70">{count}</span>
    </button>
  );
}

interface FootprintExplorerProps {
  cities: CityGroup[];
  totalPoints: number;
}

/**
 * 足迹地图面板。
 * 地图铺满整幅且不可操作，城市列表以半透明玻璃面板浮在其上；
 * 视野与点位展开由城市选择驱动，地图上的城市标记亦可点选。
 * 「打开完整地图」的入口只保留在章节标题处，此处不再重复。
 */
export function FootprintExplorer({
  cities,
  totalPoints
}: FootprintExplorerProps) {
  const [activeCity, setActiveCity] = useState<string | null>(null);

  const activeGroup = activeCity
    ? cities.find((group) => group.city === activeCity)
    : null;

  return (
    <div className="relative h-[380px] md:h-[500px]">
      {/* 地图铺满整幅。不做边缘淡出：底图与页面底色本就有色差，
          渐变只会让边界显得浑浊，改用 1px 描边把它明确成一块面板 */}
      <div className="absolute inset-0 overflow-hidden border border-lab-line">
        <FootprintMap
          cities={cities}
          activeCity={activeCity}
          onSelectCity={setActiveCity}
        />
      </div>

      {/* 城市面板：半透明加模糊，高度占满。
          置于遮罩容器之外，避免跟着一起淡出 */}
      <div
        className={clsx(
          'absolute bottom-4 right-4 top-4 z-10 flex flex-col',
          'w-[200px] md:w-[260px]',
          'border border-lab-line/50 bg-lab-ink/55 backdrop-blur-xl'
        )}
      >
        <div className="border-b border-lab-line/50 px-3 py-4">
          <Eyebrow className="block px-2">Cities</Eyebrow>
        </div>

        {/* min-h-0 使 flex 子项能正确收缩，从而让内部滚动生效 */}
        <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto px-3">
          <CityRow
            label="全部"
            count={totalPoints}
            isActive={!activeCity}
            onClick={() => setActiveCity(null)}
          />
          {cities.map((group) => (
            <CityRow
              key={group.city}
              label={group.city}
              count={group.count}
              isActive={activeCity === group.city}
              onClick={() => setActiveCity(group.city)}
            />
          ))}
        </div>

        {/* 底部读数：为列表下方的留白收个口 */}
        <div className="border-t border-lab-line/50 px-5 py-3">
          <span className="lab-mono text-lab-faint">
            {cities.length} cities
          </span>
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-4 left-4 z-10">
        <Eyebrow
          className={clsx(
            'border border-lab-line/50 bg-lab-ink/80 px-2.5 py-1.5',
            'backdrop-blur-md'
          )}
        >
          {activeGroup
            ? `${activeGroup.city} · ${activeGroup.count} spots`
            : `All regions · ${totalPoints} spots`}
        </Eyebrow>
      </div>
    </div>
  );
}
