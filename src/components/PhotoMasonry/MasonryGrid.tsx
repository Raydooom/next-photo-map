'use client';

import { PhotoItem } from '@/types';
import { PhotoCard } from './PhotoCard';
import {
  RowsPhotoAlbum,
  type Photo,
  type RenderImageContext
} from 'react-photo-album';
import 'react-photo-album/rows.css';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { PhotoPreview } from '../common/PhotoPreview';
import { replaceUrl } from '@/utils/url';

interface MasonryGridProps {
  items: PhotoItem[];
  /** 目标行高（等高瀑布流的每行高度），默认 280 */
  targetRowHeight?: number;
}

// 扩展 react-photo-album 的 Photo 类型，携带原始数据
interface AlbumPhoto extends Photo {
  item: PhotoItem;
}

export default function MasonryGrid({
  items,
  targetRowHeight = 280
}: MasonryGridProps) {
  const [mounted, setMounted] = useState(false);
  const [previewId, setPreviewId] = useState<number | undefined>(undefined);
  const [isOpen, setIsOpen] = useState(false);

  const searchParams = useSearchParams();
  const photoId = searchParams.get('photoId');

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!photoId || photoId === String(previewId)) return;

    const exists = items.some((item) => item.id === Number(photoId));
    if (exists) {
      setPreviewId(Number(photoId));
      setIsOpen(true);
    }
  }, [photoId, previewId, items]);

  // 将 PhotoItem 转换为 react-photo-album 的 Photo 格式
  const photos = useMemo<AlbumPhoto[]>(
    () =>
      items.map((item) => ({
        key: String(item.id),
        src: item.thumbLargeUrl,
        width: item.width || 1,
        height: item.height || 1,
        item
      })),
    [items]
  );
  // setTimeout(() => console.log('photos', photos), 3000);

  // 打开预览
  const openPreview = useCallback((id: number) => {
    setPreviewId(id);
    setIsOpen(true);
    replaceUrl(`${window.location.pathname}?photoId=${id}`);
  }, []);

  // 关闭预览
  const handleClosePreview = useCallback(() => {
    setPreviewId(undefined);
    setIsOpen(false);
    replaceUrl(window.location.pathname);
  }, []);

  // 自定义渲染每张照片：复用 PhotoCard（Live Photo、悬浮信息等）
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

  if (!mounted) return null;

  return (
    <>
      <PhotoPreview
        previewId={previewId}
        list={items}
        isOpen={isOpen}
        onClose={handleClosePreview}
      />
      <RowsPhotoAlbum
        photos={photos}
        targetRowHeight={targetRowHeight}
        spacing={10}
        render={{ image: renderImage }}
      />
    </>
  );
}
