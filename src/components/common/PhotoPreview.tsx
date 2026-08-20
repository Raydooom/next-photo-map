import { Modal, ModalContent } from '@heroui/modal';
import { PhotoItem } from '@/types';
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

  const onClickClose = () => {
    onClose();
  };

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
      // 关闭按钮由查看器顶栏自己提供，用 Modal 自带的会在右上角多出一个
      hideCloseButton
      classNames={{
        wrapper: 'scrollbar-gutter-none',
        // 满屏铺开：去掉 Modal 默认的圆角与浅色底，否则四角会露出容器色
        base: 'w-screen h-screen m-0 max-w-none rounded-none bg-lab-ink'
      }}
    >
      <ModalContent>
        <PhotoLightbox
          photos={list}
          currentId={previewId}
          onClose={onClickClose}
          onSelect={handleSelect}
        />
      </ModalContent>
    </Modal>
  );
}
