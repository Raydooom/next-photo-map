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
    <section className="mt-8 md:mt-12">
      {/* 标题区域 */}
      <div className="mb-5 md:mb-8">
        <h2 className="text-xl md:text-2xl font-semibold tracking-tight text-main">
          Recently Captured
        </h2>
        <p className="mt-1.5 text-xs md:text-sm text-sub">最近拍摄的精彩瞬间</p>
      </div>

      {/* 瀑布流 */}
      <Suspense>
        <MasonryGrid items={photos} targetRowHeight={300} />
      </Suspense>
      <div className="mt-6 flex justify-center">
        <Link
          href="/photos"
          className="group flex items-center gap-1.5 text-sm font-medium text-sub hover:text-main transition-colors shrink-0"
        >
          查看更多
          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </section>
  );
}
