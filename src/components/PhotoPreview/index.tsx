import { Modal, ModalContent } from '@heroui/modal';
import { PhotoDetail, PhotoItem } from '@/types';
import Carousel from './Carousel';

export default function PhotoPreview({
  current,
  list,
  isOpen,
  onClose
}: {
  current: PhotoDetail | undefined;
  list: PhotoItem[];
  isOpen: boolean;
  onClose: () => void;
}) {
  const currentIndex = current
    ? list.findIndex(item => item.id === current.id)
    : 0;

  return (
    <Modal
      isOpen={isOpen}
      size="full"
      onClose={onClose}
      classNames={{
        wrapper: 'scrollbar-gutter-none',
        base: 'w-screen h-screen m-0 max-w-none'
      }}
    >
      <ModalContent>
        <Carousel slides={list} currentPreview={current} currentIndex={currentIndex} onClose={onClose} />
      </ModalContent>
    </Modal>
  );
}
