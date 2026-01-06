import { Map } from './_components/MapWrapper';
import Service from '@/services/photo';
import { coordTransform, groupByLocation } from '@/components/Map/helper';

export default async function FootprintPage() {
  const list = await Service.getExtendList();
  const locations = list?.filter(
    item => item.exifData.GPSGpslatitude && item.exifData.GPSGpslongitude
  );
  // 转换为百度地图坐标
  const markers = locations?.map(item => ({
    id: item.id,
    photoId: item.photoId,
    exifData: item.exifData,
    point: coordTransform.transformToBaidu(
      item.exifData.GPSGpslongitude,
      item.exifData.GPSGpslatitude
    )
  }));

  // 合并坐标
  const markerGroup = Object.values(groupByLocation(markers, 14));

  return (
    <>
      <Map markerGroup={markerGroup} />
    </>
  );
}
