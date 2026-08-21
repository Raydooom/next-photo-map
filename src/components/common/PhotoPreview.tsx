import { PhotoItem } from '@/types';
import { FullscreenDialog } from '@/components/ui';
import { PhotoLightbox } from './PhotoLightbox';
import { useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { replaceUrl } from '@/utils/url';

export function PhotoPreview({
  list,
  previewId,
  isOpen,
  onClose
}: {
  previewId: number | undefined;
  list: PhotoItem[];
  isOpen: boolean;
  onClose: () => void;
}) {
  const searchParams = useSearchParams();
  const photoId = Number(searchParams.get('photoId')) || undefined;

  const onClickClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const handleSelect = useCallback(
    (item: PhotoItem) => {
      if (item.id !== photoId) {
        replaceUrl(`${window.location.pathname}?photoId=${item.id}`);
      }
    },
    [photoId]
  );

  return (
    <FullscreenDialog isOpen={isOpen} onClose={onClickClose} label="照片查看器">
      <PhotoLightbox
        photos={list}
        currentId={previewId}
        onClose={onClickClose}
        onSelect={handleSelect}
      />
    </FullscreenDialog>
  );
}
