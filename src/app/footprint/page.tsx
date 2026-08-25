import Map from './_components/Map';
import * as Actions from '@/server/actions/index';
import { groupByLocation } from '@/components/Map/helper';
import { Suspense } from 'react';
import { MarkerPoint, PhotoLocation } from '@/types';
export const dynamic = 'force-dynamic';

/** 按城市聚合后的一条索引，供侧栏列表与飞行定位使用 */
export interface CityIndexItem {
  city: string;
  province: string;
  count: number;
  /** 该城市所有点位的算术中心，点击列表时飞到这里 */
  center: MarkerPoint;
}

/**
 * 按城市归并点位。
 * 中心取算术平均即可 —— 侧栏点击只需把视野带到这座城市附近，
 * 精确取景由后续的 fitBounds 或用户自己缩放完成。
 */
interface CityAccumulator {
  province: string;
  lngSum: number;
  latSum: number;
  count: number;
}

function buildCityIndex(list: PhotoLocation[]): CityIndexItem[] {
  // 用普通对象而非 Map 累加：本模块的默认导出名为 Map（地图组件），
  // 会遮蔽全局的 Map 构造器
  const groups: Record<string, CityAccumulator> = {};

  list.forEach((item) => {
    const city = item.city?.trim();
    if (!city) return;

    if (!groups[city]) {
      groups[city] = {
        province: item.province || '',
        lngSum: 0,
        latSum: 0,
        count: 0
      };
    }

    groups[city].lngSum += item.longitude;
    groups[city].latSum += item.latitude;
    groups[city].count += 1;
  });

  return Object.entries(groups)
    .map(([city, value]) => ({
      city,
      province: value.province,
      count: value.count,
      center: [
        value.lngSum / value.count,
        value.latSum / value.count
      ] as MarkerPoint
    }))
    .sort((a, b) => b.count - a.count);
}

export default async function FootprintPage() {
  // withThumb：地图标记要显示照片本身，需要每个点位所属照片的缩略图
  const list = (await Actions.getLocations({
    withThumb: true
  })) as PhotoLocation[];

  // MapLibre 使用标准 WGS84 坐标，不需要转换
  const markers = list?.map((item: PhotoLocation) => ({
    ...item,
    point: [item.longitude, item.latitude] as MarkerPoint
  }));

  // 合并坐标
  const markerGroup = Object.values(groupByLocation(markers, 4));

  // 区域足迹：统计每个 adcode 的照片数量与所属城市
  const regionStats = list.reduce(
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

  const cityIndex = buildCityIndex(list);

  // 省份数：直辖市的 province 与 city 同名，去重后天然只算一个
  const provinceCount = Object.keys(
    list.reduce((acc: Record<string, true>, item) => {
      if (item.province) acc[item.province] = true;
      return acc;
    }, {})
  ).length;

  return (
    <Suspense>
      <Map
        markerGroup={markerGroup}
        regionStats={regionStats}
        cityIndex={cityIndex}
        stats={{
          points: list.length,
          cities: cityIndex.length,
          provinces: provinceCount
        }}
      />
    </Suspense>
  );
}
