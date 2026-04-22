import { PhotoExif } from '@/types';
import {
  ExposureTimeIcon,
  FocalLengthIcon,
  IsoIcon,
  ApertureIcon
} from '../Icons/icon';
import {
  formatExposureTime,
  formatFNumber,
  formatIso,
  formatFocalLength
} from '@/utils/format';

export const ExifTag = ({
  value,
  Icon,
  label
}: {
  value: string | number | undefined | null;
  label: string;
  Icon: React.ReactNode;
}) =>
  value ? (
    <div className="flex flex-col items-center justify-center p-2 bg-foreground/[0.03] backdrop-blur-xl rounded-2xl border-glass shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] hover:bg-foreground/[0.08] transition-all duration-300">
      {Icon}
      <span className="text-xs text-foreground/50 uppercase tracking-[0.1em]">
        {label}
      </span>
      <span className="text-xs font-semibold text-foreground mt-0.5">
        {value}
      </span>
    </div>
  ) : null;

export const ExifTagList = ({ exifData }: { exifData: Partial<PhotoExif> | null }) => (
  <div className="grid grid-cols-2 gap-2">
    <ExifTag
      label="曝光"
      Icon={<ExposureTimeIcon size={16} />}
      value={formatExposureTime(exifData?.exposureTime)}
    />
    <ExifTag
      label="光圈"
      Icon={<ApertureIcon size={16} />}
      value={formatFNumber(exifData?.fNumber)}
    />
    <ExifTag
      label="ISO"
      Icon={<IsoIcon size={16} />}
      value={formatIso(exifData?.iso)}
    />
    <ExifTag
      label="焦距"
      Icon={<FocalLengthIcon size={16} />}
      value={formatFocalLength(
        exifData?.focalLengthIn35mmFormat || exifData?.focalLength
      )}
    />
  </div>
);
