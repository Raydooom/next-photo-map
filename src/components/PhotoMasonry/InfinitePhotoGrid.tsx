'use client';

import { PhotoItem } from '@/types';
import { useCallback } from 'react';
import { getPhotoList } from '@/server/actions';
import MasonryGrid from './MasonryGrid';

interface InfinitePhotoGridProps {
  initialItems: PhotoItem[];
  total: number;
  pageSize?: number;
  targetRowHeight?: number;
}

export default function InfinitePhotoGrid({
  initialItems,
  total,
  pageSize = 20,
  targetRowHeight = 280
}: InfinitePhotoGridProps) {
  // 分页获取下一页照片（第 1 页为 initialItems，从第 2 页开始请求）
  const fetchPage = useCallback(
    async (page: number): Promise<PhotoItem[]> => {
      const { list } = await getPhotoList({ page, pageSize });
      return list as PhotoItem[];
    },
    [pageSize]
  );

  return (
    <MasonryGrid
      items={initialItems}
      total={total}
      pageSize={pageSize}
      targetRowHeight={targetRowHeight}
      fetchPage={fetchPage}
    />
  );
}
