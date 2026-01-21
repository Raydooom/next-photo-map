export interface PhotoExif {
  id: number;
  photoId: number;
  exifImageWidth: number;
  exifImageHeight: number;
  make: string | null;
  model: string | null;
  lensModel: string | null;
  fNumber: number | null;
  exposureTime: string | null;
  iso: number | null;
  focalLength: number | null;
  exposureBias: number | null;
  latitude: number | null;
  longitude: number | null;
  altitude: number | null;
  lensMake: string | null;
  flash: string | null;
  whiteBalance: string | null;
  meteringMode: string | null;
  software: string | null;
  exposureProgram: string | null;
  exposureMode: string | null;
  colorSpace: string | null;
  focalLengthIn35mmFormat: number | null;
  gpsTimeStamp: string | null;
  gpsImgDirection: number | null;
  bearingDirection: string | null;
  rawData: any | null;
}

export interface PhotoItem {
  id: number;
  filename: string;
  originalPath: string;
  size: number;
  mimeType: string;
  smallThumbnail: string;
  largeThumbnail: string;
  videoPath: string | null;
  width: number;
  height: number;
  takenAt: string | null;
  dominantColor: string | null;
  exif: PhotoExif | null;
  createdAt: string;
  updatedAt: string;
}
export interface PhotoDetail extends PhotoItem {
  exif?: PhotoExif;
}

export interface ExifData {
  id: number;
  photoId: number;
  exifData: PhotoExif;
}
