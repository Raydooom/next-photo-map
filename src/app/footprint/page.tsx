import Map from './_components/Map';
import * as Actions from '@/server/actions/index';
import { groupByLocation } from '@/components/Map/helper';
import { Suspense } from 'react';
import { MarkerPoint } from '@/types';

export default async function FootprintPage() {
  const list = await Actions.getLocations();

  // MapLibre 使用标准 WGS84 坐标，不需要转换
  const markers = list?.map(item => ({
    ...item,
    point: [item.longitude, item.latitude] as MarkerPoint
  }));

  // 合并坐标
  const markerGroup = Object.values(groupByLocation(markers, 4));
  return (
    <Suspense>
      <Map markerGroup={markerGroup} />
    </Suspense>
  );
}
