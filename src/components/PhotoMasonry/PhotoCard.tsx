'use client';

import { PhotoItem } from '@/types';
import clsx from 'clsx';
import Image from 'next/image';
import { memo, useRef, useState, useCallback } from 'react';
import LivePhotoIndicate from '@/components/modules/LivePhotoIndicate';
import { formatFileSize } from '@/utils/format';
import { motion } from 'framer-motion';

interface PhotoCardProps {
  data: PhotoItem;
  className?: string;
  onClickItem: (item: { data: PhotoItem }) => void;
}

export const PhotoCard = memo(
  ({ data, className, onClickItem }: PhotoCardProps) => {
    const [isHovered, setIsHovered] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [imageLoaded, setImageLoaded] = useState(false);
    const [videoReady, setVideoReady] = useState(false);

    const videoRef = useRef<HTMLVideoElement>(null);
    const hasVideo = Boolean(data.videoUrl);

    // ============ Live Photo 控制 ============

    const playVideo = useCallback(() => {
      if (!hasVideo) return;

      if (!videoReady) {
        setVideoReady(true);
        setIsPlaying(true);
        return;
      }

      if (videoRef.current) {
        videoRef.current.currentTime = 0;
        videoRef.current.play().catch(() => setIsPlaying(false));
        setIsPlaying(true);
      }
    }, [hasVideo, videoReady]);

    const stopVideo = useCallback(() => {
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
      }
      setIsPlaying(false);
    }, []);

    const handleVideoLoaded = useCallback(() => {
      if (isPlaying && videoRef.current) {
        videoRef.current.currentTime = 0;
        videoRef.current.play().catch(() => setIsPlaying(false));
      }
    }, [isPlaying]);

    // ============ 渲染 ============

    return (
      <motion.div
        className={clsx(
          'group relative cursor-pointer rounded-2xl overflow-hidden',
          'ring-1 ring-white/[0.08] dark:ring-white/[0.06]',
          'shadow-sm hover:shadow-xl hover:shadow-black/10 dark:hover:shadow-black/30',
          'transition-shadow duration-500 ease-out',
          className
        )}
        style={{ background: data.dominantColor || 'rgb(var(--background))' }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => {
          setIsHovered(false);
          stopVideo();
        }}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
        layout
        onClick={() => onClickItem({ data })}
      >
        {/* 图片 + 视频层 */}
        <motion.div
          className="relative"
          initial={{ filter: 'blur(12px)', opacity: 0 }}
          animate={imageLoaded ? { filter: 'blur(0px)', opacity: 1 } : {}}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          <Image
            className={clsx(
              'w-full h-auto object-contain',
              'transition-transform duration-500 ease-out',
              isHovered && !isPlaying ? 'scale-[1.03]' : 'scale-100'
            )}
            width={data.width}
            height={data.height}
            src={data.thumbLargeUrl}
            alt={data.filename}
            onLoad={() => setImageLoaded(true)}
          />

          {/* Live Photo 视频（懒加载） */}
          {hasVideo && videoReady && (
            <video
              ref={videoRef}
              className={clsx(
                'absolute inset-0 w-full h-full object-cover z-10',
                isPlaying ? 'opacity-100' : 'opacity-0'
              )}
              onEnded={stopVideo}
              onLoadedData={handleVideoLoaded}
              muted
              playsInline
              preload="auto"
              src={data.videoUrl}
            />
          )}
        </motion.div>

        {/* Live Photo 图标 */}
        {hasVideo && (
          <div
            className={clsx(
              'absolute top-3 left-3 z-40',
              'transition-opacity duration-300',
              isHovered ? 'opacity-100' : 'opacity-70'
            )}
            onMouseEnter={playVideo}
          >
            <LivePhotoIndicate isPlaying={isPlaying} />
          </div>
        )}

        {/* 底部悬浮信息 */}
        <PhotoCardOverlay data={data} visible={isHovered && !isPlaying} />
      </motion.div>
    );
  }
);

PhotoCard.displayName = 'PhotoCard';

// ============ 子组件 ============

const PhotoCardOverlay = memo(
  ({ data, visible }: { data: PhotoItem; visible: boolean }) => {
    const ext = data.filename.split('.').pop()?.toUpperCase();

    return (
      <div
        className={clsx(
          'absolute inset-x-0 bottom-0 z-20',
          'px-4 pb-3 pt-12',
          'bg-gradient-to-t from-black/60 via-black/20 to-transparent',
          'transition-all duration-300 ease-out',
          visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'
        )}
      >
        <h4 className="font-semibold text-sm text-white/95 truncate leading-tight">
          {data.filename}
        </h4>
        <p className="text-xs text-white/70 mt-1 font-medium tracking-wide">
          {ext} · {data.width}×{data.height} · {formatFileSize(data.size)}
        </p>
      </div>
    );
  }
);

PhotoCardOverlay.displayName = 'PhotoCardOverlay';
