import { PhotoItem } from '@/types';
import Link from 'next/link';
import MasonryGrid from '../PhotoMasonry/MasonryGrid';
import { Suspense } from 'react';
import { ArrowRight } from 'lucide-react';

interface RecentlyProps {
  className?: string;
  photos: PhotoItem[];
}

export function Recently({ photos }: RecentlyProps) {
  return (
    <section className="mt-12">
      {/* 标题区域 */}
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-main">
            Recently Captured
          </h2>
          <p className="mt-1.5 text-sm text-sub">最近拍摄的精彩瞬间</p>
        </div>
        <Link
          href="/photos"
          className="group flex items-center gap-1.5 text-sm font-medium text-sub hover:text-main transition-colors"
        >
          查看所有
          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      {/* 瀑布流 */}
      <Suspense>
        <MasonryGrid items={photos} targetRowHeight={240} />
      </Suspense>
    </section>
  );
}
