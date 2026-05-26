'use client';

import { PhotoItem } from '@/types';
import { PhotoCard } from './PhotoCard';
import { Masonry } from 'masonic';
import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { PhotoPreview } from '../common/PhotoPreview';
import { replaceUrl } from '@/utils/url';

interface MasonryGridProps {
  items: PhotoItem[];
  columns?: number;
}

export default function MasonryGrid({ items, columns = 5 }: MasonryGridProps) {
  const [mounted, setMounted] = useState(false);
  const [previewId, setPreviewId] = useState<number | undefined>(undefined);
  const [isOpen, setIsOpen] = useState(false);

  const searchParams = useSearchParams();
  const photoId = searchParams.get('photoId');

  // 初始化：检查 URL 中是否有 photoId 参数
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

  // 点击图片打开预览
  const handleClickItem = useCallback(({ data }: { data: PhotoItem }) => {
    setPreviewId(data.id);
    setIsOpen(true);
    replaceUrl(`${window.location.pathname}?photoId=${data.id}`);
  }, []);

  // 关闭预览
  const handleClosePreview = useCallback(() => {
    setPreviewId(undefined);
    setIsOpen(false);
    replaceUrl(window.location.pathname);
  }, []);

  // 渲染单个卡片
  const renderItem = useCallback(
    ({ data }: { data: PhotoItem }) => (
      <PhotoCard key={data.id} data={data} onClickItem={handleClickItem} />
    ),
    [handleClickItem]
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
      <Masonry
        items={items}
        columnGutter={12}
        columnCount={columns}
        render={renderItem}
      />
    </>
  );
}
