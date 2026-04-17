import * as Actions from '@/server/actions';
import { Recently } from '@/components/Home/Recently';
import { HeroSection } from '@/components/Home/HeroSection';

export default async function Home() {
  const bannerPhotos = await Actions.getPhotoList({
    pageSize: 5,
    withLocation: true,
    withExif: true
  });

  const recentlyPhotos = await Actions.getPhotoList({
    pageSize: 20,
    withLocation: true,
    withExif: true
  });

  return (
    <section className="relative min-h-screen mx-auto max-w-7xl">
      {/* Hot map */}
      <HeroSection bannerPhotos={bannerPhotos} />

      {/* Recently captured */}
      <Recently photos={recentlyPhotos.list} />
    </section>
  );
}
