import Map from './_components/Map';
import * as Actions from '@/server/actions/index';
import { groupByLocation } from '@/components/Map/helper';
import { Suspense } from 'react';
import { MarkerPoint, PhotoLocation } from '@/types';
export const dynamic = 'force-dynamic';

export default async function FootprintPage() {
  const list = await Actions.getLocations();

  // MapLibre 使用标准 WGS84 坐标，不需要转换
  const markers = list?.map((item: PhotoLocation) => ({
    ...item,
    point: [item.longitude, item.latitude] as MarkerPoint
  }));

  // 合并坐标
  const markerGroup = Object.values(groupByLocation(markers, 4));

  // 区域足迹：统计每个 adcode 的照片数量与所属城市
  const regionStats = (list as PhotoLocation[]).reduce(
    (acc: Record<string, { city: string; count: number }>, item) => {
      if (item.adcode) {
        if (!acc[item.adcode]) {
          acc[item.adcode] = { city: item.city || '', count: 0 };
        }
        acc[item.adcode].count += 1;
      }
      return acc;
    },
    {}
  );

  return (
    <Suspense>
      <Map markerGroup={markerGroup} regionStats={regionStats} />
    </Suspense>
  );
}
