import Map from './_components/Map';
import Service from '@/services/photo';
import { coordTransform, groupByLocation } from '@/components/Map/helper';
import { ExifData } from '@/types';

export default async function FootprintPage() {
  const list = await Service.getExtendList();
  const locations = list?.filter(
    item => item.exifData.GPSGpslatitude && item.exifData.GPSGpslongitude
  );
  // 转换为百度地图坐标
  const baiduPoints = (item: ExifData) =>
    coordTransform.transformToBaidu({
      lng: item.exifData.GPSGpslongitude,
      lat: item.exifData.GPSGpslatitude
    });
  const markers = locations?.map(item => ({
    id: item.id,
    photoId: item.photoId,
    exifData: item.exifData,
    point: [baiduPoints(item).lng, baiduPoints(item).lat]
  }));
  // 合并坐标
  const markerGroup = Object.values(groupByLocation(markers, 14));

  return <Map markerGroup={markerGroup} />;
}
