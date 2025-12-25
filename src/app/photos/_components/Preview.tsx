import { PhotoDetail, PhotoItem } from '@/types';
import { Modal, ModalContent } from '@heroui/modal';
import { useEffect, useState } from 'react';
import Carousel from './Carousel';

export default function Preview(props: {
  list: PhotoItem[];
  item: PhotoDetail | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  const onClose = () => {
    props.onClose();
  };

  return (
    <Modal
      hideCloseButton={true}
      isOpen={props.isOpen}
      size="full"
      onClose={onClose}
    >
      <ModalContent>
        <Carousel slides={props.list} />
      </ModalContent>
    </Modal>
  );
}
