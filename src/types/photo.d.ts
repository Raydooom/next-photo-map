export interface PhotoExif {
  id: number;
  photoId: number;
  make?: string | null;
  model?: string | null;
  lensModel?: string | null;
  fNumber?: number | null;
  exposureTime?: string | null;
  iso?: number | null;
  focalLength?: number | null;
  exposureBias?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  altitude?: number | null;
  colorSpace?: string | null;
  exposureMode?: string | null;
  exposureProgram?: string | null;
  flash?: string | null;
  focalLengthIn35mmFormat?: number | null;
  gpsTimeStamp?: string | null;
  lensMake?: string | null;
  meteringMode?: string | null;
  rawData?: any | null;
  software?: string | null;
  whiteBalance?: string | null;
  exifImageHeight?: number | null;
  exifImageWidth?: number | null;
  GPSLatitude?: number[] | null;
  GPSLatitudeRef?: string | null;
  GPSLongitude?: number[] | null;
  GPSLongitudeRef?: string | null;
  bearingDirection?: string | null;
  gpsImgDirection?: number | null;
}

export interface PhotoItem {
  id: number;
  filename: string;
  originalPath: string;
  size: number;
  mimeType: string;
  thumbSmallUrl: string;
  thumbLargeUrl: string;
  videoUrl?: string;
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
  location?: PhotoLocation;
}

export interface PhotoLocation {
  id: number;
  photoId: number;
  photo?: PhotoItem;
  latitude: number;
  longitude: number;
  latitudeDMS: string; // 维度（度分秒）
  longitudeDMS: string; // 经度 (度分秒)
  altitude?: number | null; // 朝向 (0-360)
  bearing?: number | null;
  bearingDirection?: string | null; // 中文朝向 (东、东南等)
  // 逆地理编码字段
  address?: string | null; // 详细地址
  country?: string | null; // 国家
  province?: string | null; // 省份
  city?: string | null; // 城市
  district?: string | null; // 区县
  town?: string | null; // 乡镇
  street?: string | null; // 街道
  adcode?: string | null; // 行政区划代码
}
