import * as Actions from '@/server/actions';
import { HeroCanvas } from '@/components/Home/HeroCanvas';
import { StatsGrid } from '@/components/Home/StatsGrid';
import { Recently } from '@/components/Home/Recently';
import { FootprintPanel } from '@/components/Home/FootprintPanel';
import { AiCallout } from '@/components/Home/AiCallout';
import { PhotoLocation } from '@/types';

export const dynamic = 'force-dynamic';

export default async function Home() {
  // 四个查询互不依赖，并行发起
  const [featured, recently, locations, totalPhotos] = await Promise.all([
    Actions.getPhotoList({
      pageSize: 5,
      withLocation: true,
      withExif: true,
      // 读数板要展示 AI 标签
      withAiAnalysis: true,
      top: true
    }),
    Actions.getPhotoList({
      pageSize: 10,
      withLocation: true,
      withExif: true,
      // 兼作首屏兜底数据源，故同样带上 AI 标签
      withAiAnalysis: true
    }),
    // 地图要按城市分组画点位，故经纬度必须一并取出
    Actions.getLocations({
      select: {
        adcode: true,
        city: true,
        latitude: true,
        longitude: true
      }
    }),
    Actions.countAllPhotos()
  ]);

  const cityCount = new Set(locations.map((item: PhotoLocation) => item.city))
    .size;

  // 没有任何照片被标记精选时回退到最新照片，避免首屏无图可轮播
  const heroPhotos =
    featured.list.length > 0 ? featured.list : recently.list.slice(0, 5);

  return (
    <div>
      <HeroCanvas
        photos={heroPhotos}
        totalPhotos={totalPhotos}
        cityCount={cityCount}
        spotCount={locations.length}
      />

      <StatsGrid
        totalPhotos={totalPhotos}
        cityCount={cityCount}
        spotCount={locations.length}
        latestTakenAt={recently.list[0]?.takenAt}
      />

      <Recently photos={recently.list} />

      <FootprintPanel locations={locations} />

      {/* 背景滚动照片复用最近拍摄的那批，不额外查询 */}
      <AiCallout photos={recently.list} />
    </div>
  );
}
