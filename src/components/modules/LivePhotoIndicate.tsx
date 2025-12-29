import clsx from 'clsx';
import { LivePhotoIcon } from '../Icons/icon';
import { Chip } from '@heroui/chip';

export default function LivePhotoIndicate({
  isPlaying = false
}: {
  isPlaying?: boolean;
}) {
  return (
    <Chip
      size="sm"
      classNames={{
        base: 'bg-background/50 backdrop-blur-md'
      }}
      variant="flat"
      startContent={
        <LivePhotoIcon
          className={clsx(isPlaying ? 'animate-spin-2s' : '')}
          size={16}
        />
      }
    >
      &nbsp;实况
    </Chip>
  );
}
