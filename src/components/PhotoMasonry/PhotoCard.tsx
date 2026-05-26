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

      // 首次交互：渲染 video 元素
      if (!videoReady) {
        setVideoReady(true);
        setIsPlaying(true);
        return;
      }

      // 已加载：直接播放
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
      // 视频加载完成后，如果用户已触发播放则自动播放
      if (isPlaying && videoRef.current) {
        videoRef.current.currentTime = 0;
        videoRef.current.play().catch(() => setIsPlaying(false));
      }
    }, [isPlaying]);

    // ============ 渲染 ============

    return (
      <motion.div
        className={clsx(
          'overflow-hidden relative cursor-pointer border-glass rounded',
          className
        )}
        style={{ background: data.dominantColor || '#000' }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => {
          setIsHovered(false);
          stopVideo();
        }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        layout
        onClick={() => onClickItem({ data })}
      >
        {/* 图片 + 视频层 */}
        <motion.div
          initial={{ filter: 'blur(20px)', opacity: 0 }}
          animate={imageLoaded ? { filter: 'blur(0px)', opacity: 1 } : {}}
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
            onLoad={() => setImageLoaded(true)}
          />

          {/* Live Photo 视频（懒加载） */}
          {hasVideo && videoReady && (
            <video
              ref={videoRef}
              className={clsx(
                'absolute z-10 top-0 left-0 w-full h-full object-cover',
                isPlaying ? 'block' : 'hidden'
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
          <div className="absolute top-2 left-2 z-40" onMouseEnter={playVideo}>
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
          'flex flex-col gap-2 px-3 pb-2 pt-10 w-full absolute bottom-0 left-0 z-20',
          'transition-opacity duration-300 bg-gradient-to-t from-black/70 to-transparent',
          visible ? 'opacity-100' : 'opacity-0'
        )}
      >
        <h4 className="font-bold text-sm text-white text-ellipsis whitespace-nowrap overflow-hidden">
          {data.filename}
        </h4>
        <div className="text-xs font-medium text-white/90">
          {ext} · {data.width} x {data.height} · {formatFileSize(data.size)}
        </div>
      </div>
    );
  }
);

PhotoCardOverlay.displayName = 'PhotoCardOverlay';
