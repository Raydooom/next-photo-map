import { title } from '@/components/primitives';
import Service from '@/services/';
import { Image } from '@heroui/image';

export default async function DocsPage() {
  const { list } = await Service.getPhotos();

  return (
    <div>
      {list.map(photo => (
        <Image key={photo.id} src={photo.url} alt={photo.name} />
      ))}
    </div>
  );
}
