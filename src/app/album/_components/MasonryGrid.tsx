'use client';
import { PhotoItem } from '@/types';
import { Image } from '@heroui/image';
import dynamic from 'next/dynamic';

const Masonry = dynamic(() => import('masonic').then(mod => mod.Masonry), {
  ssr: false
});

export const MasonryGrid = ({ items }: { items: PhotoItem[] }) => {
  return (
    <Masonry
      items={items}
      columnGutter={4}
      columnWidth={260}
      overscanBy={5}
      render={PhotoCard as any}
    />
  );
};

const PhotoCard = ({ data }: { data: PhotoItem }) => (
  <Image isZoomed radius="none" src={data.url} alt={data.name} />
);
