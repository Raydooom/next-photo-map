import * as Actions from '@/server/actions';
import { Recently } from '@/components/Home/Recently';
import { HotMap } from '@/components/Home/HotMap';

export default async function Home() {
  const hotPhotos = await Actions.getPhotoList({
    pageSize: 5,
    withLocation: true,
    withExif: true
  });

  const recentlyPhotos = await Actions.getPhotoList({
    pageSize: 20,
    withLocation: true,
    withExif: true
  });

  console.log("🚀🚀🚀 ~ :19 ~ Home ~ recentlyPhotos:", recentlyPhotos)

  return (
    <section className="relative min-h-screen mx-auto max-w-7xl">
      {/* Hot map */}
      <HotMap hotPhotos={hotPhotos} />

      {/* Recently captured */}
      <Recently photos={recentlyPhotos.list} />
    </section>
  );
}
