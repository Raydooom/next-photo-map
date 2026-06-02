'use client';

import { Button } from '@heroui/button';
import { AnalysisAll } from './Analysis';
import { PhotoStats } from './types';

interface PhotosToolbarProps {
  stats: PhotoStats;
  onRefresh: () => void;
  onCleanMissing: () => void;
}

export function PhotosToolbar({
  stats,
  onRefresh,
  onCleanMissing
}: PhotosToolbarProps) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-xl font-semibold">图片管理</h2>
      <div className="flex gap-3">
        <AnalysisAll onFinish={onRefresh} />
        <Button onPress={onRefresh} size="sm">
          刷新列表
        </Button>
        <Button
          color="danger"
          variant="flat"
          size="sm"
          onPress={onCleanMissing}
          disabled={stats.missing === 0}
        >
          清理丢失文件 ({stats.missing})
        </Button>
      </div>
    </div>
  );
}
