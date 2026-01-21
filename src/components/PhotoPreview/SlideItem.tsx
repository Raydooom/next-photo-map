import type { PhotoItem } from '@/types';
import { Image } from '@heroui/image';
import { useRef, useState } from 'react';
import clsx from 'clsx';
import LivePhotoIndicate from '../modules/LivePhotoIndicate';
import { flushSync } from 'react-dom';

export const SlideItem = ({ item }: { item: PhotoItem }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showVideo, setShowVideo] = useState(false);
  const playVideo = () => {
    if (isPlaying) return;
    flushSync(() => {
      setShowVideo(true);
    });
    if (item.videoPath) {
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
        videoRef.current.play();
        setIsPlaying(true);
      }
    }
  };
  const [isPlaying, setIsPlaying] = useState(false);
  const onVideoEnded = () => {
    setShowVideo(false);
    setIsPlaying(false);
  };

  return (
    <div
      className="flex-[0_0_100%] relative flex justify-center align-center overflow-hidden"
      key={item.id}
    >
      <Image
        removeWrapper
        radius="none"
        src={item.largeThumbnail}
        alt={item.filename}
        className="max-w-full max-h-full w-auto h-auto object-contain"
      />

      {item.videoPath && (
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
              onEnded={() => onVideoEnded()}
              ref={videoRef}
              muted={true}
              src={item.videoPath}
            ></video>
          )}
        </>
      )}
    </div>
  );
};
