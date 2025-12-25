'use client';

import { PhotoItem, PhotoDetail } from '@/types';
import { PhotoCard } from './PhotoCard';
import { Masonry } from 'masonic';
import { useCallback, useEffect, useState } from 'react';
import Preview from './Preview';
import * as Actions from '../actions';
import { AnimatePresence, motion } from 'framer-motion';

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
  // 在父组件内
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
      <AnimatePresence>
        {isOpen && (
          <motion.div
            layoutId="shared-container"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1, ease: 'easeOut' }}
            onClick={() => setIsOpen(false)}
            className="fixed z-40 w-full h-full"
          ></motion.div>
        )}
      </AnimatePresence>

      <Masonry
        items={items}
        columnGutter={4}
        columnCount={5}
        render={renderItem}
      />
    </>
  );
}
