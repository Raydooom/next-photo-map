import * as Actions from '@/server/actions';
import { StatsGrid } from '@/components/Home/statsGrid';
import { Recently } from '@/components/Home/recently';
import { HotMap } from '@/components/Home/hotMap';

export default async function Home() {
  const hotPhotos = await Actions.getPhotoList({
    pageSize: 5,
    withLocation: true,
    withExif: true
  });
  return (
    <main className="relative min-h-screen">
      {/* Hot map */}
      <HotMap hotPhotos={hotPhotos} />
      <div className="mx-auto max-w-7xl">
        {/* Hero section with stats */}
        <section className="mb-8">
          <div className="mb-6">
            <h1 className="text-balance text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Photo Map
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              在地图上记录你的每一次旅程与珍贵瞬间
            </p>
          </div>

          {/* Stats grid - bento style */}
          <StatsGrid />
          {/* Recently captured */}
          <Recently />
        </section>
      </div>
    </main>
  );
}
