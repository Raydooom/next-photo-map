'use client';

import { PhotoItem } from '@/types';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Spinner } from '@heroui/spinner';
import { getPhotoList } from '@/server/actions';
import MasonryGrid from './MasonryGrid';

interface InfinitePhotoGridProps {
  initialItems: PhotoItem[];
  total: number;
  pageSize?: number;
  /** 等高瀑布流目标行高 */
  targetRowHeight?: number;
}

export default function InfinitePhotoGrid({
  initialItems,
  total,
  pageSize = 20,
  targetRowHeight = 280
}: InfinitePhotoGridProps) {
  const [items, setItems] = useState<PhotoItem[]>(initialItems);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const sentinelRef = useRef<HTMLDivElement>(null);
  // 用 ref 保存最新状态，避免 IntersectionObserver 回调闭包过期
  const loadingRef = useRef(loading);
  const pageRef = useRef(page);
  loadingRef.current = loading;
  pageRef.current = page;

  const hasMore = items.length < total;

  const loadMore = useCallback(async () => {
    if (loadingRef.current) return;
    if (items.length >= total) return;

    setLoading(true);
    try {
      const nextPage = pageRef.current + 1;
      const { list } = await getPhotoList({ page: nextPage, pageSize });

      if (list.length > 0) {
        setItems((prev) => {
          // 按 id 去重，避免重复追加
          const existingIds = new Set(prev.map((p) => p.id));
          const merged = list.filter((p: PhotoItem) => !existingIds.has(p.id));
          return [...prev, ...merged];
        });
        setPage(nextPage);
      }
    } catch (error) {
      console.error('加载更多照片失败:', error);
    } finally {
      setLoading(false);
    }
  }, [items.length, total, pageSize]);

  // 监听底部哨兵元素，进入视口时加载下一页
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { rootMargin: '300px' } // 提前 300px 预加载
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  return (
    <>
      <MasonryGrid items={items} targetRowHeight={targetRowHeight} />

      {/* 底部加载状态 */}
      <div ref={sentinelRef} className="flex justify-center py-8">
        {loading ? (
          <Spinner size="sm" />
        ) : hasMore ? (
          <span className="text-sm text-default-400">下拉加载更多</span>
        ) : items.length > 0 ? (
          <span className="text-sm text-default-400">
            已加载全部 {total} 张
          </span>
        ) : null}
      </div>
    </>
  );
}
