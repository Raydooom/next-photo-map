import { ArrowUpRight } from 'lucide-react';

import { LabButton, Reveal, SectionHeading } from '@/components/ui';
import { PhotoLocation } from '@/types';
import { AreaMap } from './AreaMap';

interface FootprintPanelProps {
  locations: Pick<PhotoLocation, 'adcode' | 'city'>[];
  cityCount: number;
}

/** 足迹地图区块：地图铺满面板，底部 56px 信息条承载读数。 */
export function FootprintPanel({ locations, cityCount }: FootprintPanelProps) {
  return (
    <section className="lab-shell py-[var(--lab-section-gap)]">
      <SectionHeading
        index="03"
        eyebrow="Footprints"
        title="Mapped by GPS."
        description="点亮的区域来自照片自带的定位信息，没有手工标注。"
        action={
          <LabButton
            href="/footprint"
            variant="ghost"
            className="px-0"
            endContent={<ArrowUpRight className="h-3.5 w-3.5" />}
          >
            打开完整地图
          </LabButton>
        }
      />

      <Reveal>
        <div className="lab-panel overflow-hidden">
          <div className="relative h-[380px] md:h-[520px]">
            <AreaMap data={locations} />
          </div>

          {/* 底部信息条 */}
          <div className="flex h-[var(--lab-cell)] items-center justify-between gap-4 border-t border-lab-line px-4 md:px-6">
            <span className="lab-mono truncate text-lab-muted">
              China / province view
            </span>
            <span className="lab-mono shrink-0 tabular-nums text-lab-muted">
              {cityCount} cities · {locations.length} spots
            </span>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
