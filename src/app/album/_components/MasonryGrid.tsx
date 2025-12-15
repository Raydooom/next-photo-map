'use client';
import { PhotoItem } from '@/types';
import clsx from 'clsx';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { Chip } from '@heroui/chip';
import { useMemo, useRef, useState } from 'react';
import {
  FNumberIcon,
  FocalLengthIcon,
  IsoIcon,
  LivePhotoIcon,
  ShutterSpeedIcon
} from '@/components/icons';
import {
  formatExposureTime,
  formatFNumber,
  formatIso,
  formatFocalLength,
  formatFileSize
} from '@/utils/exif';

const Masonry = dynamic(() => import('masonic').then(mod => mod.Masonry), {
  ssr: false
});

export const MasonryGrid = ({ items }: { items: PhotoItem[] }) => {
  return (
    <Masonry
      items={items}
      columnGutter={4}
      columnWidth={260}
      overscanBy={5}
      render={PhotoCard as any}
    />
  );
};

const PhotoCard = ({ data }: { data: PhotoItem }) => {
  const [isHovered, setIsHovered] = useState(false);

  const exifTags = useMemo(
    () => [
      {
        label: '焦距',
        value: formatFocalLength(
          data.focalLengthIn35MmFilm || data.focalLength
        ),
        icon: <FocalLengthIcon color="#fff" />
      },
      {
        label: '快门速度',
        value: formatExposureTime(data.exposureTime),
        icon: <ShutterSpeedIcon color="#fff" />
      },
      {
        label: '光圈',
        value: formatFNumber(data.fNumber),
        icon: <FNumberIcon color="#fff" />
      },
      {
        label: 'ISO',
        value: formatIso(data.iso),
        icon: <IsoIcon color="#fff" />
      }
    ],
    [data]
  );

  const videoRef = useRef<HTMLVideoElement>(null);
  const onMouseEnter = () => {
    setIsHovered(true);
    if (data.videoUrl) {
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
        videoRef.current.play();
      }
    }
  };

  return (
    <div
      className="overflow-hidden relative cursor-pointer bg-black"
      onMouseEnter={() => onMouseEnter()}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Image
        className={clsx(
          'w-full h-full object-cover transition-all ease-in-out duration-300',
          isHovered && !data.videoUrl
            ? 'scale-105 opacity-85'
            : 'scale-100 opacity-100'
        )}
        width={data.width}
        height={data.height}
        src={data.url}
        alt={data.name}
        blurDataURL={data.url}
        placeholder="blur" // 加载时可选的模糊效果
      />
      {data.videoUrl && (
        <video
          className={clsx(
            'absolute z-10 top-0 left-0 w-full h-full object-cover',
            isHovered ? 'block' : 'hidden'
          )}
          ref={videoRef}
          muted={true}
          src={data.videoUrl}
        ></video>
      )}

      {/* livephoto 图标 */}
      {data.videoUrl && (
        <div className="absolute top-2 left-2 z-20">
          <Chip
            size="sm"
            classNames={{
              base: 'bg-black/50 text-white backdrop-blur-md  max-w-full'
            }}
            variant="flat"
            startContent={<LivePhotoIcon color="#fff" />}
          >
            &nbsp;实况
          </Chip>
        </div>
      )}

      {/* 底部信息 */}
      <div
        className={clsx(
          'flex flex-col gap-2 px-3 pb-2 pt-10 w-full absolute bottom-0 left-0 z-40 transition-all duration-300 bg-gradient-to-t from-black/70 to-transparent',
          isHovered && !data.videoUrl ? 'opacity-100' : 'opacity-0'
        )}
      >
        <h4 className="font-bold text-sm text-white text-ellipsis whitespace-nowrap overflow-hidden max-h-3/4">
          {data.originName}
        </h4>
        <div className="text-xs font-medium text-white/90 ">
          {data.ext ? data.ext.toUpperCase() : ''} · {data.width} x{' '}
          {data.height} · {formatFileSize(data.size)}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {exifTags.map(tag => (
            <ExifTag key={tag.label} value={tag.value} icon={tag.icon} />
          ))}
        </div>
      </div>
    </div>
  );
};

const ExifTag = ({
  value,
  icon
}: {
  value: string | number;
  icon: React.ReactNode;
}) =>
  value ? (
    <Chip
      size="sm"
      classNames={{
        base: 'bg-white/10 text-white/90 backdrop-blur-md p-2 max-w-full'
      }}
      radius="sm"
      variant="flat"
      startContent={icon}
    >
      &nbsp;&nbsp;{value}
    </Chip>
  ) : null;
