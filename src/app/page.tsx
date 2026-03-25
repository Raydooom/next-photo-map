import Service from '@/services/photo';
import HeroCarousel from '@/components/Home/HeroCarousel';
import { Navbar } from '@/components/navbar';

export default async function Home() {
  const list = await Service.getPhotoDetailBatch([46, 47, 48]);

  if (!list.length) return;
  return (
    <main className="relative min-h-screen">
      <div className="absolute top-0 w-full z-50">
        <Navbar className="bg-transparent/20 backdrop-blur-sm" />
      </div>
      <HeroCarousel items={list} />
    </main>
  );
}
