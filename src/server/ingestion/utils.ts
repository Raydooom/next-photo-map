import 'server-only';

import path from 'path';

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

/** 方位角转中文朝向（16 方位） */
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
