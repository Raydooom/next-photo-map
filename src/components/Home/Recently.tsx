import { Suspense } from 'react';
import { ArrowRight } from 'lucide-react';

import { PhotoItem } from '@/types';
import MasonryGrid from '../PhotoMasonry/MasonryGrid';
import { LabButton, SectionHeading } from '@/components/ui';

interface RecentlyProps {
  className?: string;
  photos: PhotoItem[];
}

export function Recently({ photos }: RecentlyProps) {
  return (
    <section className="lab-shell py-[var(--lab-section-gap)]">
      <SectionHeading
        index="02"
        eyebrow="Recently captured"
        title="Latest frames."
        description="最近拍摄的影像，按时间倒序排列。"
        action={
          <LabButton
            href="/photos"
            variant="ghost"
            className="px-0"
            endContent={
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover/btn:translate-x-0.5" />
            }
          >
            查看全部
          </LabButton>
        }
      />

      <Suspense>
        {/* 行高 280 在桌面 1288px 容器下约合一行 3 张，
            12 张约 4 行、1.3 屏，首页作为预览的合适密度 */}
        <MasonryGrid items={photos} targetRowHeight={280} />
      </Suspense>
    </section>
  );
}
