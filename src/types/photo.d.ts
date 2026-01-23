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
