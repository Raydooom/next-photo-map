import { Modal, ModalContent } from '@heroui/modal';
import { PhotoDetail, PhotoItem } from '@/types';
import Carousel from './Carousel';

export default function PhotoPreview({
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
        <Carousel slides={list} previewId={previewId} onClose={onClickClose} />
      </ModalContent>
    </Modal>
  );
}
