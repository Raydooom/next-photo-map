'use client';

import { useState } from 'react';
import clsx from 'clsx';

import { Eyebrow } from '@/components/ui';
import { trailingFadeStyle } from '@/utils/mask';
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

/**
 * 窄屏的城市筹码。
 *
 * 与竖排列表相比，横滑一条筹码不占地图的宽度，仍是一次点击直达，
 * 每个城市的点位数也保得住；比下拉选择少一次展开操作，
 * 也不必把系统原生控件放进这套直角描边的界面里。
 */
function CityChip({ label, count, isActive, onClick }: CityRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isActive}
      className={clsx(
        'flex min-h-11 shrink-0 cursor-pointer items-center gap-2 px-3',
        'border transition-colors',
        'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-lab-accent',
        isActive
          ? 'border-lab-accent text-lab-accent'
          : 'border-lab-line text-lab-muted'
      )}
    >
      {/* 城市名含中文，不套 lab-mono 的大写与宽字距 */}
      <span className="text-[13px] [font-variation-settings:'wght'_560]">
        {label}
      </span>
      <span className="lab-mono tabular-nums opacity-70">{count}</span>
    </button>
  );
}

interface FootprintExplorerProps {
  cities: CityGroup[];
  totalPoints: number;
}

/**
 * 足迹地图面板。
 * 地图铺满整幅且不可操作，视野与点位展开由城市选择驱动，
 * 地图上的城市标记亦可点选。
 * 「打开完整地图」的入口只保留在章节标题处，此处不再重复。
 *
 * 城市选择分两种排布：宽屏用浮在地图上的竖排列表；
 * 窄屏地图本就不够看，浮层会压掉大半幅，故移到地图下方横滑。
 */
export function FootprintExplorer({
  cities,
  totalPoints
}: FootprintExplorerProps) {
  const [activeCity, setActiveCity] = useState<string | null>(null);

  const activeGroup = activeCity
    ? cities.find((group) => group.city === activeCity)
    : null;

  // 「全部」与各城市同为一组可选项，两种排布共用
  const options = [
    { key: '__all__', label: '全部', count: totalPoints, city: null },
    ...cities.map((group) => ({
      key: group.city,
      label: group.city,
      count: group.count,
      city: group.city
    }))
  ];

  return (
    <div className="md:relative md:h-[500px]">
      {/* 地图铺满整幅。不做边缘淡出：底图与页面底色本就有色差，
          渐变只会让边界显得浑浊，改用 1px 描边把它明确成一块面板 */}
      <div className="relative h-[300px] overflow-hidden border border-lab-line md:absolute md:inset-0 md:h-auto">
        <FootprintMap
          cities={cities}
          activeCity={activeCity}
          onSelectCity={setActiveCity}
        />

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

      {/* 窄屏：地图下方的横滑筹码，右端淡出提示还有更多 */}
      <div
        className="mt-3 flex gap-2 overflow-x-auto pb-1 md:hidden"
        style={trailingFadeStyle}
      >
        {options.map((option) => (
          <CityChip
            key={option.key}
            label={option.label}
            count={option.count}
            isActive={activeCity === option.city}
            onClick={() => setActiveCity(option.city)}
          />
        ))}
      </div>

      {/* 宽屏：半透明加模糊的竖排列表，高度占满 */}
      <div
        className={clsx(
          'absolute bottom-4 right-4 top-4 z-10 hidden flex-col md:flex',
          'w-[260px]',
          'border border-lab-line/50 bg-lab-ink/55 backdrop-blur-xl'
        )}
      >
        <div className="border-b border-lab-line/50 px-3 py-4">
          <Eyebrow className="block px-2">Cities</Eyebrow>
        </div>

        {/* min-h-0 使 flex 子项能正确收缩，从而让内部滚动生效 */}
        <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto px-3">
          {options.map((option) => (
            <CityRow
              key={option.key}
              label={option.label}
              count={option.count}
              isActive={activeCity === option.city}
              onClick={() => setActiveCity(option.city)}
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
    </div>
  );
}
