import { PhotoItem } from '@/types';
import { FullscreenDialog } from '@/components/ui';
import { PhotoLightbox } from './PhotoLightbox';
import { useCallback } from 'react';
import { readUrlParam, setUrlParam } from '@/utils/url';

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
  const onClickClose = useCallback(() => {
    onClose();
  }, [onClose]);

  /**
   * 翻页时同步地址栏。
   *
   * isOpen 为假时直接跳过：查看器有退场动画，那期间组件仍然挂载，
   * 任何迟到的回调都不该把刚清掉的 photoId 写回去。
   *
   * 比对的是浏览器真实 URL 而不是 useSearchParams —— 地址栏由
   * history.replaceState 改写，useSearchParams 不会跟着重新求值，
   * 拿它比对会一直用打开时的那个旧值。
   */
  const handleSelect = useCallback(
    (item: PhotoItem) => {
      if (!isOpen) return;

      if (readUrlParam('photoId') !== String(item.id)) {
        setUrlParam('photoId', String(item.id));
      }
    },
    [isOpen]
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
