import Map from './_components/Map';
import Service from '@/services/photo';
import { coordTransform, groupByLocation } from '@/components/Map/helper';
import { PhotoLocation } from '@/types';

export default async function FootprintPage() {
  const list = await Service.getPhotoLocations();
  // 转换为百度地图坐标
  const baiduPoints = (item: PhotoLocation) =>
    coordTransform.transformToBaidu({
      lng: item.longitude,
      lat: item.latitude
    });
  const markers = list?.map(item => ({
    ...item,
    bPoint: { lng: baiduPoints(item).lng, lat: baiduPoints(item).lat }
  }));
  // 合并坐标
  const markerGroup = Object.values(groupByLocation(markers, 4));

  return <Map markerGroup={markerGroup} />;
}
