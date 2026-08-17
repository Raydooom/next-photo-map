import dayjs from 'dayjs';

import { Eyebrow, RevealGroup, RevealItem, StatCell } from '@/components/ui';

interface StatsGridProps {
  totalPhotos: number;
  cityCount: number;
  spotCount: number;
  /** 最近一张照片的拍摄时间 */
  latestTakenAt?: string | null;
}

/**
 * 数据概览。
 * 描边由「容器左上 + 每格右下」拼合，换行时网格线仍然连续。
 */
export function StatsGrid({
  totalPhotos,
  cityCount,
  spotCount,
  latestTakenAt
}: StatsGridProps) {
  const cells = [
    { index: '01', value: totalPhotos, label: 'Frames', hint: '归档照片' },
    { index: '02', value: cityCount, label: 'Cities', hint: '到过的城市' },
    { index: '03', value: spotCount, label: 'Spots', hint: '定位足迹点' },
    {
      index: '04',
      // 紧凑数字格式，与相邻格的大号数字保持同一套字形
      value: latestTakenAt ? dayjs(latestTakenAt).format('YY.MM.DD') : '—',
      label: 'Latest',
      hint: '最近拍摄'
    }
  ];

  return (
    <section className="lab-shell py-[var(--lab-section-gap)]">
      <Eyebrow className="mb-6 block">Archive index</Eyebrow>

      <RevealGroup className="grid grid-cols-2 border-l border-t border-lab-line md:grid-cols-4">
        {cells.map((cell) => (
          <RevealItem
            key={cell.index}
            className="border-b border-r border-lab-line"
          >
            <StatCell
              index={cell.index}
              value={cell.value}
              label={cell.label}
              hint={cell.hint}
              className="h-full"
            />
          </RevealItem>
        ))}
      </RevealGroup>
    </section>
  );
}
