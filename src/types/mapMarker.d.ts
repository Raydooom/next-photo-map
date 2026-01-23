import { PhotoLocation } from '@/types';

// 图片数据扩展百度经纬度
export type MarkerListDataItem = PhotoLocation & {
  bPoint: { lng: number; lat: number };
};

// 地图标记数据
export type MapMarker = {
  bPoint: { lng: number; lat: number };
  count?: number;
  list: MarkerListDataItem[];
};

// 聚合点数据
export type ClusterPointData = {
  isCluster?: boolean;
  pointCount?: number;
  data: MapMarker;
};
