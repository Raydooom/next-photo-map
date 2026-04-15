import { PhotoLocation } from '@/types';

type Longitude = number;
type Latitude = number;
export type MarkerPoint = [Longitude, Latitude];

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
