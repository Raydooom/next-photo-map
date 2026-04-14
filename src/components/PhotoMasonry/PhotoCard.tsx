'use client';
import { PhotoItem } from '@/types';
import clsx from 'clsx';
import Image from 'next/image';
import { memo, useRef, useState } from 'react';
import LivePhotoIndicate from '@/components/modules/LivePhotoIndicate';
import { formatFileSize } from '@/utils/format';
import { motion } from 'framer-motion';

export const PhotoCard = memo(
  ({
    data,
    className,
    onClickItem
  }: {
    data: PhotoItem;
    className?: string;
    onClickItem: (item: { data: PhotoItem }) => void;
  }) => {
    const [isHovered, setIsHovered] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const playVideo = () => {
      if (data.videoUrl) {
        if (videoRef.current) {
          videoRef.current.currentTime = 0;
          videoRef.current.play();
          setIsPlaying(true);
        }
      }
    };
    const [isPlaying, setIsPlaying] = useState(false);
    const onVideoEnded = () => {
      setTimeout(() => {
        if (videoRef.current && isPlaying) {
          videoRef.current.pause();
          videoRef.current.currentTime = 0;
        }
        setIsPlaying(false);
      });
    };

    const [loading, setLoading] = useState(true);

    return (
      <motion.div
        className={clsx(
          'overflow-hidden relative cursor-pointer border border-border rounded',
          className
        )}
        style={{
          background: data.dominantColor || '#000'
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        layout
        onClick={() => onClickItem({ data })}
      >
        <motion.div
          initial={{ filter: 'blur(20px)', opacity: 0 }}
          animate={!loading ? { filter: 'blur(0px)', opacity: 1 } : {}}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        >
          <Image
            className={clsx(
              'z-1 w-full h-auto object-contain transition-all ease-in-out duration-300',
              isHovered ? 'scale-105 opacity-85' : 'scale-100 opacity-100'
            )}
            width={data.width}
            height={data.height}
            src={data.thumbLargeUrl}
            alt={data.filename}
            onLoad={() => setLoading(false)}
          />
          {data.videoUrl && (
            <video
              className={clsx(
                'absolute z-10 top-0 left-0 w-full h-full object-cover',
                isPlaying ? 'block' : 'hidden'
              )}
              onEnded={() => onVideoEnded()}
              ref={videoRef}
              muted={true}
              src={data.videoUrl}
            />
          )}
        </motion.div>

        {/* livephoto 图标 */}
        {data.videoUrl && (
          <div
            className="absolute top-2 left-2 z-40"
            onMouseEnter={playVideo}
            onMouseLeave={onVideoEnded}
          >
            <LivePhotoIndicate isPlaying={isPlaying} />
          </div>
        )}

        {/* 底部信息 */}
        <div
          className={clsx(
            'flex flex-col gap-2 px-3 pb-2 pt-10 w-full absolute bottom-0 left-0 z-20 transition-all duration-300 bg-gradient-to-t from-black/70 to-transparent',
            isHovered && !isPlaying ? 'opacity-100' : 'opacity-0'
          )}
        >
          <h4 className="font-bold text-sm text-white text-ellipsis whitespace-nowrap overflow-hidden max-h-3/4">
            {data.filename}
          </h4>
          <div className="text-xs font-medium text-white/90 ">
            {data.filename.split('.').pop()?.toUpperCase()} · {data.width} x{' '}
            {data.height} · {formatFileSize(data.size)}
          </div>
        </div>
      </motion.div>
    );
  }
);

PhotoCard.displayName = 'PhotoCard';
