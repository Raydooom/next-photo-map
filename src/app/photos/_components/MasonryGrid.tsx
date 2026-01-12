'use client';

import { PhotoItem, PhotoDetail } from '@/types';
import { PhotoCard } from './PhotoCard';
import { Masonry } from 'masonic';
import { useCallback, useEffect, useState } from 'react';
import PhotoPreview from '@/components/PhotoPreview';
import { replaceUrl } from '@/utils/history';

export default function MasonryGrid({ items }: { items: PhotoItem[] }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [previewItem, setPreviewItem] = useState<PhotoDetail | undefined>(
    undefined
  );
  const [isOpen, setIsOpen] = useState(false);
  const onClickItem = useCallback(async (item: { data: PhotoItem }) => {
    setPreviewItem(item.data);
    setIsOpen(true);

    // 记录当前点击的图片id
    replaceUrl(`${window.location.pathname}?photoId=${item.data.id}`);
  }, []);

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
        current={previewItem}
        list={items}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
      <Masonry
        items={items}
        columnGutter={4}
        columnCount={5}
        render={renderItem}
      />
    </>
  );
}
