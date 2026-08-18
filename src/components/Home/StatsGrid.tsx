import dayjs from 'dayjs';

import {
  NumberRoll,
  RevealGroup,
  RevealItem,
  SectionHeading,
  StatCell
} from '@/components/ui';

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
    { index: '01', value: totalPhotos, label: 'Frames', hint: '照片' },
    { index: '02', value: cityCount, label: 'Cities', hint: '城市' },
    { index: '03', value: spotCount, label: 'Spots', hint: '足迹' },
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
      {/* 本区块是章节 01，后面依次是 02 最近拍摄、03 足迹地图。
          不给大标题：四格读数本身就是内容，再加一行 44px 英文标题会与
          下一屏的「Latest frames.」撞形式，也把这块的分量抬得过重 */}
      <SectionHeading index="01" eyebrow="Archive index" />

      <RevealGroup className="grid grid-cols-2 border-l border-t border-lab-line md:grid-cols-4">
        {cells.map((cell, index) => (
          <RevealItem
            key={cell.index}
            className="border-b border-r border-lab-line"
          >
            <StatCell
              index={cell.index}
              value={
                <NumberRoll
                  value={cell.value}
                  // 本区块在首屏之外，故等进入视口再滚；
                  // 逐格递延，与 RevealGroup 的进场顺序一致
                  startOnView
                  delay={index * 0.1}
                />
              }
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
