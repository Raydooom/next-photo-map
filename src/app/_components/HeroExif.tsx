import clsx from 'clsx';

import { PhotoItem } from '@/types';
import {
  formatExposureTime,
  formatFNumber,
  formatFocalLength,
  formatIso
} from '@/utils/format';

interface HeroExifProps {
  photo: PhotoItem | null;
  className?: string;
}

/**
 * 当前照片的拍摄参数读数。
 * 贴在首屏右下角，与左下的标题信息形成对角平衡；缺失的参数直接省略。
 */
export function HeroExif({ photo, className }: HeroExifProps) {
  const exif = photo?.photoExif;
  const iso = formatIso(exif?.iso);

  const parts = [
    formatFocalLength(exif?.focalLength),
    formatFNumber(exif?.fNumber),
    formatExposureTime(exif?.exposureTime),
    iso ? `ISO ${iso}` : ''
  ].filter(Boolean);

  if (parts.length === 0) return null;

  return (
    <p
      className={clsx(
        // normal-case 覆盖 lab-mono 的大写转换：拍摄参数惯例为小写 mm / f / s
        'lab-mono normal-case text-lab-on-media-muted',
        className
      )}
    >
      {parts.join(' · ')}
    </p>
  );
}
