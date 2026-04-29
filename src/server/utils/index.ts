import path from 'path';
import exifr from 'exifr';
export { Logger, createLogger, logger } from './logger';

// 获取文件MIME类型
export function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.png':
      return 'image/png';
    case '.webp':
      return 'image/webp';
    case '.heic':
      return 'image/heic';
    default:
      return 'application/octet-stream';
  }
}

// 扩展 exifr 解析
export const getExifMetadata = async (filePath: string) => {
  return await exifr
    .parse(filePath, {
      tiff: true,
      exif: true,
      gps: true
    })
    .catch(() => null);
};

/**
 * 将十进制经纬度转换为度分秒格式
 * @param coordinate 坐标值
 * @param isLat 是否为纬度
 */
export function toDMS(coordinate: number, isLat: boolean): string {
  const absolute = Math.abs(coordinate);
  const degrees = Math.floor(absolute);
  const minutesNotTruncated = (absolute - degrees) * 60;
  const minutes = Math.floor(minutesNotTruncated);
  const seconds = ((minutesNotTruncated - minutes) * 60).toFixed(2);

  let direction = '';
  if (isLat) {
    direction = coordinate >= 0 ? 'N' : 'S';
  } else {
    direction = coordinate >= 0 ? 'E' : 'W';
  }

  return `${degrees}° ${minutes}' ${seconds}" ${direction}`;
}

/**
 * 格式化原始 EXIF GPS 数据为 DMS 字符串
 */
export function formatDMSFromRaw(dms: number[], ref: string): string {
  if (!Array.isArray(dms) || dms.length < 3) return '';
  const [degrees, minutes, seconds] = dms;
  const secStr =
    typeof seconds === 'number' ? seconds.toFixed(2) : String(seconds);
  return `${degrees}° ${minutes}' ${secStr}" ${ref}`;
}

/**
 * 将方位角转换为中文朝向 (16方位)
 */
export function getDirectionFromBearing(bearing: number): string {
  const normalized = ((bearing % 360) + 360) % 360;
  const directions = [
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
  const index = Math.round(normalized / 22.5) % 16;
  return directions[index];
}
