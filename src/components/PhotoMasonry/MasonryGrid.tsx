'use client';

import { PhotoItem } from '@/types';
import { PhotoCard } from './PhotoCard';
import { Masonry } from 'masonic';
import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { PhotoPreview } from '../common/PhotoPreview';
import { replaceUrl } from '@/utils/url';

export default function MasonryGrid({
  items,
  columns = 5
}: {
  items: PhotoItem[];
  columns?: number;
}) {
  const [mounted, setMounted] = useState(false);

  const [previewId, setPreviewId] = useState<number | undefined>(undefined);
  const [isOpen, setIsOpen] = useState(false);

  const searchParams = useSearchParams();
  const photoId = searchParams.get('photoId');

  useEffect(() => {
    setMounted(true);
    if (photoId === String(previewId)) return;
    if (photoId && !previewId) {
      const activeIndex = items.findIndex(item => item.id === Number(photoId));
      if (activeIndex !== -1) {
        setPreviewId(Number(photoId));
        setIsOpen(true);
      }
    }
  }, [photoId, previewId, items]);

  // 点击图片时，设置预览图片id并打开预览弹窗
  const onClickItem = useCallback(async (item: { data: PhotoItem }) => {
    setPreviewId(item.data.id);
    setIsOpen(true);
    // 记录当前点击的图片id
    replaceUrl(`${window.location.pathname}?photoId=${item.data.id}`);
  }, []);

  const onClosePreview = () => {
    setPreviewId(undefined);
    setIsOpen(false);
    replaceUrl(window.location.pathname);
  };

  const renderItem = useCallback(
    ({ data }: { data: PhotoItem }) => (
      <PhotoCard key={data.id} data={data} onClickItem={onClickItem} />
    ),
    [onClickItem]
  );

  if (!mounted) {
    return null;
  }
  return (
    <>
      <PhotoPreview
        previewId={previewId}
        list={items}
        isOpen={isOpen}
        onClose={onClosePreview}
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
