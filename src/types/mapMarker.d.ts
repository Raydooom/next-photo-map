import { PhotoLocation } from '@/types';

export type MarkerPoint = { longitude: number; latitude: number };

// 地图标记数据
export type MapMarker = {
  point: MarkerPoint;
  count: number;
  list: PhotoLocation[];
};

// 聚合点数据
export type ClusterPointData = {
  isCluster?: boolean;
  pointCount?: number;
  data: MapMarker;
};
