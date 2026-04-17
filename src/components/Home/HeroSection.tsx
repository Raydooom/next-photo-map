import { PhotoItem } from '@/types';
import { Calendar } from './Calendar';
import { Banner } from './Banner';

interface HotMapProps {
  bannerPhotos: {
    total: number;
    list: PhotoItem[];
  };
}

export function HeroSection({ bannerPhotos }: HotMapProps) {
  return (
    <main className="flex h-[450px]">
      <Banner photos={bannerPhotos.list} />
      {/* 右侧日历区域 */}
      <div className="w-80 h-full pl-3 shrink-0">
        {/* <Calendar date={currentPhoto?.takenAt} /> */}
      </div>
    </main>
  );
}
