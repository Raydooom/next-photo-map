import type { PhotoItem } from '@/types';
import { Image } from '@heroui/image';
import { Chip } from '@heroui/chip';
import { useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import clsx from 'clsx';
import { LivePhotoIcon } from '../Icons/icon';

export function LivePhotoIndicate({
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

export const LivePhoto = ({
  photoInfo,
  imageFit = 'contain',
  disableLive = false
}: {
  photoInfo: PhotoItem;
  imageFit?: 'contain' | 'cover';
  disableLive?: boolean;
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showVideo, setShowVideo] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const playVideo = () => {
    if (isPlaying) return;
    flushSync(() => {
      setShowVideo(true);
    });
    if (photoInfo.videoUrl) {
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
        videoRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const onVideoEnded = () => {
    setShowVideo(false);
    setIsPlaying(false);
  };

  return (
    <div
      className="flex-[0_0_100%] relative flex justify-center align-center overflow-hidden"
      key={photoInfo.id}
    >
      <Image
        removeWrapper
        radius="none"
        src={photoInfo.thumbLargeUrl}
        alt={photoInfo.filename}
        className={clsx(
          'w-full h-full',
          imageFit === 'cover'
            ? 'object-cover'
            : 'object-contain max-w-full max-h-full w-auto h-auto'
        )}
      />

      {photoInfo.videoUrl && !disableLive && (
        <>
          <div
            className="absolute top-4 left-4 z-10 cursor-pointer"
            onClick={playVideo}
          >
            <LivePhotoIndicate isPlaying={isPlaying} />
          </div>
          {showVideo && (
            <video
              className={clsx(
                'absolute z-10 left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 max-w-full max-h-full w-auto h-auto object-cover'
              )}
              onEnded={onVideoEnded}
              ref={videoRef}
              muted={true}
              src={photoInfo.videoUrl}
            />
          )}
        </>
      )}
    </div>
  );
};
