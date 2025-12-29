'use client';

import { PhotoItem, PhotoDetail } from '@/types';
import { PhotoCard } from './PhotoCard';
import { Masonry } from 'masonic';
import { useCallback, useEffect, useState } from 'react';
import * as Actions from '../actions';
import PhotoPreview from '@/components/PhotoPreview';

export default function MasonryGrid({ items }: { items: PhotoItem[] }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [previewItem, setPreviewItem] = useState<PhotoDetail | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const onClickItem = useCallback(async (item: { data: PhotoItem }) => {
    const detail = await Actions.getPhotoDetail(item.data.id);
    setPreviewItem(detail);
    setIsOpen(true);
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
