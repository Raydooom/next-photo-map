import { ArrowUpRight } from 'lucide-react';

import { LabButton, SectionHeading } from '@/components/ui';
import { PhotoLocation } from '@/types';
import { FootprintExplorer } from './FootprintExplorer';
import type { CityGroup } from './FootprintMap';

type LocationRow = Pick<
  PhotoLocation,
  'adcode' | 'city' | 'latitude' | 'longitude'
>;

interface FootprintPanelProps {
  locations: LocationRow[];
}

/** 点位的算术中心。用于放置城市汇总标记，无需精确质心 */
function getCenter(points: [number, number][]): [number, number] {
  const [sumLng, sumLat] = points.reduce(
    (acc, [lng, lat]) => [acc[0] + lng, acc[1] + lat],
    [0, 0]
  );

  return [sumLng / points.length, sumLat / points.length];
}

/**
 * 按城市聚合坐标点；缺少城市名或经纬度的记录无法上图，直接跳过。
 * adcode 是区县级编码，同一城市会涉及多个区县，故按城市收集成集合，
 * 后续用于高亮该城市范围内所有到过的行政区。
 */
function groupByCity(locations: LocationRow[]): CityGroup[] {
  const grouped = new Map<
    string,
    { city: string; adcodes: Set<string>; points: [number, number][] }
  >();

  locations.forEach(({ city, adcode, latitude, longitude }) => {
    if (!city || latitude == null || longitude == null) return;

    let group = grouped.get(city);
    if (!group) {
      group = { city, adcodes: new Set<string>(), points: [] };
      grouped.set(city, group);
    }

    if (adcode) group.adcodes.add(adcode);
    group.points.push([longitude, latitude]);
  });

  return (
    Array.from(grouped.values())
      .map(({ city, adcodes, points }) => ({
        city,
        adcodes: Array.from(adcodes),
        points,
        center: getCenter(points),
        count: points.length
      }))
      // 点位多的城市排在前面
      .sort((a, b) => b.count - a.count)
  );
}

/** 足迹地图区块。数据聚合在服务端完成，客户端只负责交互 */
export function FootprintPanel({ locations }: FootprintPanelProps) {
  const cities = groupByCity(locations);
  const totalPoints = cities.reduce((sum, group) => sum + group.count, 0);

  return (
    <section className="lab-shell py-[var(--lab-section-gap)]">
      <SectionHeading
        index="03"
        eyebrow="Footprints"
        title="Traces of light."
        description="照片记得自己在哪里被拍下。点开一座城市，看看在那里停留过多少地方。"
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

      <FootprintExplorer cities={cities} totalPoints={totalPoints} />
    </section>
  );
}
