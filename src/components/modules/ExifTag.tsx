import { PhotoItem } from '@/types';
import { Chip } from '@heroui/chip';
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
import clsx from 'clsx';

export const ExifTag = ({
  value,
  Icon,
  mode
}: {
  value: string | number;
  Icon: React.ReactNode;
  mode?: 'dark' | 'light';
}) =>
  value ? (
    <Chip
      size="sm"
      classNames={{
        base: clsx(
          'border backdrop-blur-md py-3 px-2 max-w-full tracking-wider',
          mode === 'dark'
            ? 'bg-black/20 text-white/90 border-white/5'
            : 'bg-background/10 text-foreground/90 border-foreground/10'
        )
      }}
      radius="sm"
      variant="flat"
      startContent={Icon}
    >
      &nbsp;&nbsp;{value}
    </Chip>
  ) : null;

export const ExifTagList = ({
  mode,
  photo
}: {
  mode?: 'dark' | 'light';
  photo: PhotoItem | undefined;
}) => (
  <div className="grid grid-cols-2 gap-2">
    <ExifTag
      mode={mode}
      Icon={<ExposureTimeIcon size={16} />}
      value={formatExposureTime(photo?.exposureTime)}
    />
    <ExifTag
      mode={mode}
      Icon={<ApertureIcon size={16} />}
      value={formatFNumber(photo?.fNumber)}
    />
    <ExifTag
      mode={mode}
      Icon={<IsoIcon size={16} />}
      value={formatIso(photo?.iso)}
    />
    <ExifTag
      mode={mode}
      Icon={<FocalLengthIcon size={16} />}
      value={formatFocalLength(
        photo?.focalLengthIn35MmFilm || photo?.focalLength
      )}
    />
  </div>
);
