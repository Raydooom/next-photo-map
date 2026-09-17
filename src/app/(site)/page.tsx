import { PhotoService } from '@/server/photo/photo.service';
import { locationService } from '@/server/photo/location.service';
import { HeroCanvas } from './_components/HeroCanvas';
import { StatsGrid } from './_components/StatsGrid';
import { Recently } from './_components/Recently';
import { FootprintPanel } from './_components/FootprintPanel';
import { AiCallout } from './_components/AiCallout';
import { PhotoLocation } from '@/lib/types';
import { Footer } from '@/components/layout/Footer';

export const dynamic = 'force-dynamic';

export default async function Home() {
  // Server Component 与 service 同进程，直接调用即可，无需绕经 Server Action
  const photoService = new PhotoService();

  // 四个查询互不依赖，并行发起
  const [featured, recently, locations, totalPhotos] = await Promise.all([
    photoService.listPhotos({
      pageSize: 5,
      withLocation: true,
      withExif: true,
      // 读数板要展示 AI 标签
      withAiAnalysis: true,
      top: true
    }),
    photoService.listPhotos({
      pageSize: 10,
      withLocation: true,
      withExif: true,
      // 兼作首屏兜底数据源，故同样带上 AI 标签
      withAiAnalysis: true
    }),
    // 地图要按城市分组画点位，故经纬度必须一并取出
    locationService.listLocations({
      select: {
        adcode: true,
        city: true,
        latitude: true,
        longitude: true
      }
    }),
    photoService.countAllPhotos()
  ]);

  const cityCount = new Set(locations.map((item: PhotoLocation) => item.city))
    .size;

  // 没有任何照片被标记精选时回退到最新照片，避免首屏无图可轮播
  const heroPhotos =
    featured.list.length > 0 ? featured.list : recently.list.slice(0, 5);

  return (
    <div>
      {/* 首屏只报照片总数，城市与足迹点交给下一屏的读数网格，避免两屏重复 */}
      <HeroCanvas photos={heroPhotos} totalPhotos={totalPhotos} />

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

      {/* 页脚只出现在首页，故由页面自己引入，不放进 (site) 布局 */}
      <Footer />
    </div>
  );
}
