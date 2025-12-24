'use client';

import { PhotoItem } from '@/types';
import { useRouter } from 'next/navigation';
import { PhotoCard } from './PhotoCard';
import { Masonry } from 'masonic';
import { useEffect, useState } from 'react';

export const MasonryGrid = ({ items }: { items: PhotoItem[] }) => {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const onClickItem = (item: { data: PhotoItem; index: number }) => {
    router.push(`/photo`);
  };

  if (!mounted) {
    return null;
  }

  return (
    <Masonry
      items={items}
      columnGutter={4}
      columnCount={5}
      render={({ data, index, width }) => (
        <div style={{ width }}>
          <PhotoCard data={data} index={index} onClick={onClickItem} />
        </div>
      )}
    />
  );
};
