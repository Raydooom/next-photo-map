import { ExifType } from '@/types';
import { convertToDecimal } from '@/utils/map';

export const formatExposureTime = (exposureTime?: string) => {
  if (!exposureTime) {
    return '';
  }
  return `1/${Math.round(1 / Number(exposureTime))}s`;
};

export const formatFNumber = (fNumber?: string) => {
  if (!fNumber) {
    return '';
  }
  return `f/${Number(Number(fNumber).toFixed(2))}`;
};

export const formatIso = (iso?: string) => {
  if (!iso) {
    return '';
  }
  return Number(iso);
};

export const formatFocalLength = (focalLength?: string | number) => {
  if (!focalLength) {
    return '';
  }
  return `${Math.round(parseFloat(focalLength.toString()))}mm`;
};
// 格式化曝光补偿
export const formatExposurebias = (value?: number) => {
  if (value !== undefined) {
    return `${Number(value).toFixed(2)} EV`;
  }
  return '';
};
// 格式化尺寸
export const formatDimension = (width?: number, height?: number) => {
  if (width !== undefined && height !== undefined) {
    return `${width}px × ${height}px`;
  }
  return '';
};
// 格式化像素， 单位MP
export const formatPixel = (width?: number, height?: number) => {
  if (width !== undefined && height !== undefined) {
    const total_pixels = width * height;
    const mp = total_pixels / 1_000_000;
    return `${mp.toFixed(1)} MP`;
  }
  return '';
};

export const formatFileSize = (size: number) => {
  if (!size) {
    return '';
  }
  return `${(size / 1024 / 1024).toFixed(2)} MB`;
};

export const formatLatLng = (exif?: ExifType) => {
  const {
    GPSGpslatitude,
    GPSGpslatituderef,
    GPSGpslongitude,
    GPSGpslongituderef
  } = exif || {};
  if (
    GPSGpslatitude !== undefined &&
    GPSGpslatituderef !== undefined &&
    GPSGpslongitude !== undefined &&
    GPSGpslongituderef !== undefined
  ) {
    const latDecimal = convertToDecimal(GPSGpslatitude, GPSGpslatituderef);
    const lngDecimal = convertToDecimal(GPSGpslongitude, GPSGpslongituderef);

    return `${latDecimal.toFixed(6)}°${GPSGpslatituderef}, ${lngDecimal.toFixed(6)}°${GPSGpslongituderef}`;
  }
  return '';
};

export const formatDirection = (degree?: number) => {
  if (degree === undefined) {
    return '';
  }
  const sectors = [
    '正北',
    '北偏东',
    '东北',
    '东偏北',
    '正东',
    '东偏南',
    '东南',
    '南偏东',
    '正南',
    '南偏西',
    '西南',
    '西偏南',
    '正西',
    '西偏北',
    '西北',
    '北偏西'
  ];
  // 每个扇区占 22.5 度，加上偏移量 11.25 使其居中
  const index = Math.floor(((degree + 11.25) % 360) / 22.5);
  return `${sectors[index]}（${degree.toFixed(2)}°）`;
};

export const formatAltitude = (altitude?: number) => {
  if (altitude === undefined) {
    return '';
  }
  return `约 ${altitude.toFixed(2)} 米`;
};
