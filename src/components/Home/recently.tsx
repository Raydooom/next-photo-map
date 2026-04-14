import { PhotoItem } from '@/types';
import Link from 'next/link';
import MasonryGrid from '../PhotoMasonry/MasonryGrid';

interface PhotoGalleryProps {
  className?: string;
  photos: PhotoItem[];
}

export function Recently({ photos: recentlyPhotos }: PhotoGalleryProps) {
  return (
    <section className="mt-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            Recently Captured
          </h2>
          <p className="mt-1 text-muted-foreground">最近拍摄的精彩瞬间</p>
        </div>
        <Link
          href="/photos"
          className="text-sm font-medium text-primary transition-colors hover:text-primary/80"
        >
          查看所有
        </Link>
      </div>

      {/* Masonry grid */}
      <MasonryGrid items={recentlyPhotos} columns={5} />
    </section>
  );
}
