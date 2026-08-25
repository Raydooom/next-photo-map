import { PhotoItem } from '@/types';
import {
  formatAltitude,
  formatDimension,
  formatExposureTime,
  formatExposurebias,
  formatFNumber,
  formatFileSize,
  formatFocalLength,
  formatIso,
  formatLatLng
} from './format';

/**
 * 曝光四要素的键，供使用方按键配图标。
 * 函数只吐数据不带 JSX —— 两处查看器的图标尺寸与排布并不相同。
 */
export type ExposureKey = 'aperture' | 'shutter' | 'iso' | 'focal';

export interface ExposureReadout {
  key: ExposureKey;
  /** 英文短标签，正好用得上等宽字体的宽字距 */
  label: string;
  value: string;
}

export interface PhotoMeta {
  /** 曝光四要素，缺失项已剔除，剩几项排几项 */
  readouts: ExposureReadout[];
  /** 白平衡、测光、尺寸这类次要参数，压成一串 */
  details: string[];
  /** 机身型号 */
  model?: string | null;
  /** 镜头型号 */
  lensModel?: string | null;
  /** 「城市 · 区县」 */
  place: string;
  /** 经纬度 */
  latLng: string;
  /** 海拔 */
  altitude: string;
  /** 中文朝向（东、东南……） */
  bearingDirection: string;
  /** AI 分析出的标签 */
  tags: string[];
}

/**
 * 把一张照片摊成查看器要显示的各项读数。
 *
 * 抽成纯函数是为了让两处查看器（照片墙的抽屉、足迹页的常驻栏）共用
 * 同一套取值与格式化 —— 版式差异很大，但"光圈该怎么写成 f/2.8"
 * 这件事只该有一个答案，各写一遍迟早会改一处漏一处。
 *
 * 数据直接取列表已经带下来的字段，不再请求详情：照片墙的列表接口带了
 * withExif / withLocation / withAiAnalysis，且列表与详情走同一个
 * transformPhoto，结构一致。
 */
export function extractPhotoMeta(photo: PhotoItem): PhotoMeta {
  const exif = photo.photoExif;
  const location = photo.location;

  const readouts: ExposureReadout[] = (
    [
      {
        key: 'aperture',
        label: 'Aperture',
        value: formatFNumber(exif?.fNumber)
      },
      {
        key: 'shutter',
        label: 'Shutter',
        value: formatExposureTime(exif?.exposureTime)
      },
      { key: 'iso', label: 'ISO', value: formatIso(exif?.iso) },
      {
        key: 'focal',
        label: 'Focal',
        value: formatFocalLength(
          exif?.focalLengthIn35mmFormat || exif?.focalLength
        )
      }
    ] as { key: ExposureKey; label: string; value: unknown }[]
  )
    .filter((item) => Boolean(item.value))
    .map((item) => ({ ...item, value: String(item.value) }));

  const details = [
    exif?.whiteBalance && `WB ${exif.whiteBalance}`,
    exif?.meteringMode,
    formatExposurebias(exif?.exposureBias),
    formatDimension(exif?.exifImageWidth || 0, exif?.exifImageHeight || 0),
    formatFileSize(photo.size || 0)
  ].filter((item): item is string => Boolean(item));

  return {
    readouts,
    details,
    model: exif?.model,
    lensModel: exif?.lensModel,
    place: [location?.city, location?.district].filter(Boolean).join(' · '),
    latLng: formatLatLng(location) || '',
    altitude: formatAltitude(exif?.altitude) || '',
    bearingDirection: exif?.bearingDirection ?? '',
    tags: photo.photoAiAnalysis?.tags ?? []
  };
}
