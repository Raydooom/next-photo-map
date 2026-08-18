import { PhotoItem } from '@/types';
import {
  EmblaCarouselType,
  EmblaOptionsType,
  EmblaPluginType
} from 'embla-carousel';

export type CarouselProps = {
  slides: PhotoItem[];
  options?: EmblaOptionsType;
  plugins?: EmblaPluginType[];
  currentId?: number;
  /**
   * 交出 embla 实例，供外部自建控件驱动切换。
   * 会作为 effect 依赖，故须传入稳定引用（如 useState 的 setter）
   */
  onApi?: (api: EmblaCarouselType | undefined) => void;
  onSelect?: (item: PhotoItem) => void;
  onClose?: () => void;
  showThumbnails?: boolean;
  showControls?: boolean;
  showIndicators?: boolean;
  showExif?: boolean;
  isFullScreen?: boolean;
  imageFit?: 'contain' | 'cover';
  disableLive?: boolean;
  className?: string;
};

export interface MainSliderProps {
  slides: PhotoItem[];
  emblaRef: (node: HTMLElement | null) => void;
  imageFit?: 'contain' | 'cover';
  disableLive?: boolean;
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

export interface IndicatorsProps {
  count: number;
  selectedIndex: number;
  onIndicatorClick?: (index: number) => void;
  className?: string;
}
