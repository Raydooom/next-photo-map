import { PhotoExif, PhotoLocation } from '@/lib/types';
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

/**
 * 优先用度分秒加参考方向，没有则退回十进制坐标。
 *
 * 参数不写成 `Partial<PhotoLocation> | Partial<PhotoExif>` —— 联合类型上
 * 只能访问共有字段，而 GPSLatitudeRef / GPSLongitudeRef 只有 EXIF 有
 * （Location 表没这两列）。列成结构化类型，两种实参都能传。
 */
export const formatLatLng = (
  location?: {
    GPSLatitude?: number[] | null;
    GPSLongitude?: number[] | null;
    GPSLatitudeRef?: string | null;
    GPSLongitudeRef?: string | null;
    latitude?: number | null;
    longitude?: number | null;
  } | null
) => {
  const { GPSLatitude, GPSLongitude, GPSLatitudeRef, GPSLongitudeRef } =
    location || {};
  if (GPSLatitude && GPSLongitude && GPSLatitudeRef && GPSLongitudeRef) {
    return `${GPSLongitude[0]}°${GPSLongitude[1]}′${GPSLongitude[2]}″${GPSLongitudeRef}, ${GPSLatitude[0]}°${GPSLatitude[1]}′${GPSLatitude[2]}″${GPSLatitudeRef}`;
  } else if (location?.latitude && location?.longitude) {
    return `${location.longitude.toFixed(6)}, ${location.latitude.toFixed(6)}`;
  } else {
    return '';
  }
};

export const formatAltitude = (altitude?: number | null) => {
  if (altitude === undefined || altitude === null) {
    return '';
  }
  return `海拔约 ${altitude.toFixed(2)} 米`;
};

/**
 * 中文本地化日期。
 *
 * @param withTime 是否补上时分秒。
 *   列表类场景多数只关心日期，时间会把列撑宽。
 */
export const formatDateCN = (
  datetime?: Date | string | null,
  withTime = true
) => {
  if (!datetime) {
    return '';
  }
  const date = new Date(datetime);
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  };
  if (withTime) {
    options.hour = '2-digit';
    options.minute = '2-digit';
    options.second = '2-digit';
  }
  return date.toLocaleDateString('zh-CN', options);
};

/**
 * 拍摄日期。本年只给月日，跨年才补上年份 —— 同批照片多在同年，年份没有区分度。
 *
 * @param separator 省略时用中文单位（2025年10月03日）；
 *   传入则以它连接各段（'/' → 2025/10/03），供等宽读数一类场景使用，
 *   中文的「年/月/日」在宽字距下会被拉散。
 */
export const formatTakenDate = (
  // Prisma 的 DateTime 映射为 Date，RSC 序列化后仍是 Date。
  // 原先只声明 string 是错的，运行时靠 dayjs 兼容才没出问题
  date?: Date | string | null,
  separator?: string
) => {
  if (!date) {
    return '';
  }
  const target = dayjs(date);
  const needYear = target.year() !== dayjs().year();

  if (separator === undefined) {
    return target.format(needYear ? 'YYYY年MM月DD日' : 'MM月DD日');
  }

  // 逐段取值再 join，而非拼进 format 模板：分隔符含字母时会被当成格式 token
  const segments = needYear ? ['YYYY', 'MM', 'DD'] : ['MM', 'DD'];
  return segments.map((token) => target.format(token)).join(separator);
};
