import * as Actions from '@/server/actions';
import { Recently } from '@/components/Home/Recently';
import { HeroSection } from '@/components/Home/HeroSection';
export const dynamic = 'force-dynamic';

export default async function Home() {
  const recentlyPhotos = await Actions.getPhotoList({
    pageSize: 20,
    withLocation: true,
    withExif: true
  });

  return (
    <section className="relative min-h-screen mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4 md:py-6">
      {/* Hot map */}
      <HeroSection />

      {/* Recently captured */}
      <Recently photos={recentlyPhotos.list} />
    </section>
  );
}
