'use client';

import { Tabs, Tab } from '@heroui/tabs';
import { PhotoStats, FilterTab } from './types';

interface PhotosFilterTabsProps {
  stats: PhotoStats;
  activeTab: FilterTab;
  onChange: (tab: FilterTab) => void;
}

export function PhotosFilterTabs({
  stats,
  activeTab,
  onChange
}: PhotosFilterTabsProps) {
  return (
    <Tabs
      aria-label="照片过滤"
      selectedKey={activeTab}
      onSelectionChange={(key) => onChange(key as FilterTab)}
      className="mb-4"
    >
      <Tab key="all" title={`全部(${stats.total})`} />
      <Tab key="exists" title={`文件存在(${stats.exists})`} />
      <Tab key="missing" title={`文件丢失(${stats.missing})`} />
      <Tab key="no-location" title={`文件无坐标(${stats.noLocation})`} />
      <Tab key="top" title={`已置顶(${stats.top})`} />
    </Tabs>
  );
}
