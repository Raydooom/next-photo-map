import { Modal, ModalContent } from '@heroui/modal';
import { PhotoItem } from '@/types';
import Carousel from '../Carousel';
import { useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { getParams, replaceUrl } from '@/utils/url';

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
  const onClickClose = () => {
    onClose();
  };

  const photoId = Number(getParams('photoId')) || undefined;
  const handleSelect = useCallback(
    (item: PhotoItem) => {
      if (item.id !== photoId) {
        replaceUrl(`${window.location.pathname}?photoId=${item.id}`);
      }
    },
    [photoId]
  );
  return (
    <Modal
      isOpen={isOpen}
      size="full"
      onClose={onClickClose}
      classNames={{
        wrapper: 'scrollbar-gutter-none',
        base: 'w-screen h-screen m-0 max-w-none'
      }}
    >
      <ModalContent>
        <Carousel
          slides={list}
          currentId={previewId}
          onClose={onClickClose}
          onSelect={handleSelect}
          showThumbnails
          showControls
          showExif
          isFullScreen
        />
      </ModalContent>
    </Modal>
  );
}
