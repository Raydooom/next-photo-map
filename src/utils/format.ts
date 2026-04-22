import { PhotoExif, PhotoLocation } from '@/types';
import dayjs from 'dayjs';

export const formatExposureTime = (exposureTime?: string | null) => {
  if (!exposureTime) {
    return '';
  }
  // If it already contains '/', assume it's formatted (e.g. "1/100")
  if (exposureTime.includes('/')) {
    return `${exposureTime}s`;
  }

  const val = Number(exposureTime);

  if (isNaN(val)) return exposureTime;

  if (val >= 1) return `${val}s`;
  // Avoid division by zero
  if (val === 0) return '0s';
  return `1/${Math.round(1 / val)}s`;
};

export const formatFNumber = (fNumber?: number | null) => {
  if (!fNumber) {
    return '';
  }
  return `f/${Number(fNumber)}`;
};

export const formatIso = (iso?: number | null) => {
  if (!iso) {
    return '';
  }
  return iso;
};

export const formatFocalLength = (focalLength?: number | null) => {
  if (!focalLength) {
    return '';
  }
  return `${Math.round(Number(focalLength))}mm`;
};

// 格式化曝光补偿
export const formatExposurebias = (value?: number | null) => {
  if (value !== undefined && value !== null) {
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

export const formatLatLng = (
  location?: Partial<PhotoLocation> | Partial<PhotoExif> | null
) => {
  const { GPSLatitude, GPSLongitude, GPSLatitudeRef, GPSLongitudeRef } =
    location || {};
  if (GPSLatitude && GPSLongitude && GPSLatitudeRef && GPSLongitudeRef) {
    return `${GPSLongitude[0]}°${GPSLongitude[1]}′${GPSLongitude[2]}″${GPSLongitudeRef}, ${GPSLatitude[0]}°${GPSLatitude[1]}′${GPSLatitude[2]}″${GPSLatitudeRef}`;
  }
  return '';
};

export const formatAltitude = (altitude?: number | null) => {
  if (altitude === undefined || altitude === null) {
    return '';
  }
  return `约 ${altitude.toFixed(2)} 米`;
};

export const formatTakenCN = (takenAt?: string | null) => {
  if (!takenAt) {
    return '';
  }
  const date = new Date(takenAt);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

export const formatTakenDate = (date?: string | null) => {
  if (!date) {
    return '';
  }
  const year = dayjs(date).year();
  if (year === dayjs().year()) {
    return dayjs(date).format('MM月DD日');
  }
  return dayjs(date).format('YYYY年MM月DD日');
};
