import { PhotoLocation, MarkerPoint } from '@/types';
export interface GroupedLocation {
  point: MarkerPoint;
  list: PhotoLocation[];
  count: number;
}
// 合并坐标
export const groupByLocation = (
  locationList: (PhotoLocation & {
    point: MarkerPoint;
  })[],
  precision = 2
) => {
  return locationList.reduce(
    (groups: Record<string, GroupedLocation>, location) => {
      // 创建一个唯一的网格 Key，例如 "31.23,121.47"
      const key = `${location.point[0].toFixed(precision)},${location.point[1].toFixed(precision)}`;

      if (!groups[key]) {
        groups[key] = {
          point: location.point,
          list: [],
          count: 0
        };
      }

      groups[key].list.push(location);
      groups[key].count++;
      return groups;
    },
    {}
  );
};
