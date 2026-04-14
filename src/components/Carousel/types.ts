import { PhotoItem } from '@/types';
import { EmblaOptionsType, EmblaPluginType } from 'embla-carousel';

export type CarouselProps = {
  slides: PhotoItem[];
  options?: EmblaOptionsType;
  plugins?: EmblaPluginType[];
  currentId: number | undefined;
  onSelect?: (item: PhotoItem) => void;
  onClose?: () => void;
  showThumbnails?: boolean;
  showControls?: boolean;
  showExif?: boolean;
  isFullScreen?: boolean;
  imageFit?: 'contain' | 'cover';
  className?: string;
};

export interface MainSliderProps {
  slides: PhotoItem[];
  emblaRef: (node: HTMLElement | null) => void;
  imageFit?: 'contain' | 'cover';
}

export interface ThumbnailsProps {
  slides: PhotoItem[];
  emblaRef: (node: HTMLElement | null) => void;
  selectedIndex: number;
  onThumbClick: (index: number) => void;
}

export interface ControlsProps {
  showExif: boolean;
  isExifVisible: boolean;
  onToggleExif: () => void;
  onClose?: () => void;
  onPrev: () => void;
  onNext: () => void;
}
