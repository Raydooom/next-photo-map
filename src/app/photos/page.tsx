import PhotoService from '@/services/photo';
import MasonryGrid from './_components/MasonryGrid';

export default async function DocsPage() {
  const { list } = await PhotoService.getPhotos({
    page: 1,
    pageSize: 10000
  });
  return (
    <div className="min-h-screen p-2">
      <MasonryGrid items={list} />
    </div>
  );
}
