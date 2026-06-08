'use client';

import { PhotoItem } from '@/types';
import { PhotoCard } from './PhotoCard';
import {
  RowsPhotoAlbum,
  type Photo,
  type RenderImageContext
} from 'react-photo-album';
import InfiniteScroll from 'react-photo-album/scroll';
import 'react-photo-album/rows.css';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Spinner } from '@heroui/spinner';
import { PhotoPreview } from '../common/PhotoPreview';
import { replaceUrl } from '@/utils/url';

interface AlbumPhoto extends Photo {
  item: PhotoItem;
}

interface MasonryGridProps {
  /** 初始照片（首屏 / 第一页） */
  items: PhotoItem[];
  /** 等高瀑布流目标行高 */
  targetRowHeight?: number;
  /** 总数（用于判断是否加载完毕） */
  total?: number;
  /** 每页数量 */
  pageSize?: number;
  /**
   * 分页获取函数。传入则启用无限滚动；不传则为静态网格（如首页）。
   * @param page 页码（从 2 开始，第 1 页为 items）
   */
  fetchPage?: (page: number) => Promise<PhotoItem[]>;
}

// 将 PhotoItem 转为 react-photo-album 的 Photo
const toAlbumPhoto = (item: PhotoItem): AlbumPhoto => ({
  key: String(item.id),
  src: item.thumbLargeUrl,
  width: item.width || 1,
  height: item.height || 1,
  item
});

// 图片间距（行间距 / 列间距 / 分页之间的间距保持一致）
const SPACING = 10;

export default function MasonryGrid({
  items,
  targetRowHeight = 280,
  total,
  pageSize = 20,
  fetchPage
}: MasonryGridProps) {
  const isInfinite = Boolean(fetchPage);

  const [mounted, setMounted] = useState(false);
  const [previewId, setPreviewId] = useState<number | undefined>(undefined);
  const [isOpen, setIsOpen] = useState(false);

  // 累积的完整列表（用于预览/灯箱）。无限滚动模式下随分页增长。
  const [accumulated, setAccumulated] = useState<PhotoItem[]>(items);

  const searchParams = useSearchParams();
  const photoId = searchParams.get('photoId');

  useEffect(() => {
    setMounted(true);
  }, []);

  // 静态模式下，items 变化时同步累积列表
  useEffect(() => {
    if (!isInfinite) setAccumulated(items);
  }, [items, isInfinite]);

  useEffect(() => {
    if (!photoId || photoId === String(previewId)) return;
    if (accumulated.some(item => item.id === Number(photoId))) {
      setPreviewId(Number(photoId));
      setIsOpen(true);
    }
  }, [photoId, previewId, accumulated]);

  const initialAlbumPhotos = useMemo(() => items.map(toAlbumPhoto), [items]);

  const openPreview = useCallback((id: number) => {
    setPreviewId(id);
    setIsOpen(true);
    replaceUrl(`${window.location.pathname}?photoId=${id}`);
  }, []);

  const handleClosePreview = useCallback(() => {
    setPreviewId(undefined);
    setIsOpen(false);
    replaceUrl(window.location.pathname);
  }, []);

  const renderImage = useCallback(
    (_: unknown, { photo, width, height }: RenderImageContext<AlbumPhoto>) => (
      <PhotoCard
        data={photo.item}
        width={width}
        height={height}
        onClick={() => openPreview(photo.item.id)}
      />
    ),
    [openPreview]
  );

  // 无限滚动的取数函数：返回下一批照片，结束时返回 null
  const fetchBatch = useCallback(
    async (index: number): Promise<AlbumPhoto[] | null> => {
      // index 为已加载的批次数；首批（items）为第 1 页，故请求 index + 1 页
      const page = index + 1;

      // 已加载数量 >= 总数则结束
      if (total !== undefined && (page - 1) * pageSize >= total) {
        return null;
      }

      try {
        const list = await fetchPage!(page);
        if (!list || list.length === 0) return null;

        // 同步累积列表（去重）供预览使用
        setAccumulated(prev => {
          const ids = new Set(prev.map(p => p.id));
          const merged = list.filter(p => !ids.has(p.id));
          return merged.length ? [...prev, ...merged] : prev;
        });

        return list.map(toAlbumPhoto);
      } catch (error) {
        console.error('加载更多照片失败:', error);
        throw error;
      }
    },
    [fetchPage, total, pageSize]
  );

  if (!mounted) return null;

  return (
    <>
      <PhotoPreview
        previewId={previewId}
        list={accumulated}
        isOpen={isOpen}
        onClose={handleClosePreview}
      />

      {isInfinite ? (
        // InfiniteScroll 在非 singleton 模式下，每一页（批次）会渲染成独立的
        // RowsPhotoAlbum 容器。spacing 只控制单页内的行间距，页与页之间默认无间距。
        // 这里用 flex 列布局 + gap 让分页之间的间距与页内行间距保持一致。
        <div className="flex flex-col" style={{ gap: `${SPACING}px` }}>
          <InfiniteScroll
            photos={initialAlbumPhotos}
            fetch={fetchBatch}
            loading={
              <div className="flex justify-center py-8">
                <Spinner size="sm" />
              </div>
            }
            finished={
              accumulated.length > 0 ? (
                <div className="text-center py-8 text-sm text-default-400">
                  已加载全部 {total ?? accumulated.length} 张
                </div>
              ) : null
            }
            error={
              <div className="text-center py-8 text-sm text-danger">
                加载失败，请重试
              </div>
            }
          >
            <RowsPhotoAlbum
              photos={[]}
              targetRowHeight={targetRowHeight}
              spacing={SPACING}
              render={{ image: renderImage }}
            />
          </InfiniteScroll>
        </div>
      ) : (
        <RowsPhotoAlbum
          photos={initialAlbumPhotos}
          targetRowHeight={targetRowHeight}
          spacing={SPACING}
          render={{ image: renderImage }}
        />
      )}
    </>
  );
}
