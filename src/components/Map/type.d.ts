import { PhotoExif } from './../../types/photo.d';

interface BaiduMapProps {
  center?: { lng: number; lat: number };
  marker?: { lng: number; lat: number };
  zoom?: number;
  onMapLoad?: (map: any) => void;
  config?: {
    enableScrollWheelZoom?: boolean;
    zoom?: number;
  };
}

export interface MarkerComponentProps {
  exifData?: PhotoExif;
  zoom?: number;
}
