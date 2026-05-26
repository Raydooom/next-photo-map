'use client';
import { PhotoItem } from '@/types';
import clsx from 'clsx';
import Image from 'next/image';
import { memo, useRef, useState, useEffect } from 'react';
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
    const [isPlaying, setIsPlaying] = useState(false);
    const [loading, setLoading] = useState(true);
    const [videoLoaded, setVideoLoaded] = useState(false);
    const [shouldLoadVideo, setShouldLoadVideo] = useState(false);

    const videoRef = useRef<HTMLVideoElement>(null);

    // 只在用户首次交互时加载视频
    useEffect(() => {
      if (shouldLoadVideo && data.videoUrl && !videoLoaded) {
        setVideoLoaded(true);
      }
    }, [shouldLoadVideo, data.videoUrl, videoLoaded]);

    // 视频加载完成后自动播放
    useEffect(() => {
      if (videoRef.current && videoLoaded && shouldLoadVideo) {
        videoRef.current.load(); // 触发视频加载
      }
    }, [videoLoaded, shouldLoadVideo]);

    const playVideo = () => {
      if (data.videoUrl) {
        // 首次播放时触发加载
        setShouldLoadVideo(true);

        // 如果视频已加载，立即播放
        if (videoRef.current && videoLoaded) {
          videoRef.current.currentTime = 0;
          videoRef.current.play().catch(() => {
            // 视频可能还在加载中
          });
          setIsPlaying(true);
        } else {
          // 视频还在加载，设置一个标志，等加载完成后播放
          setIsPlaying(true);
        }
      }
    };

    const stopVideo = () => {
      if (videoRef.current && isPlaying) {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
      }
      setIsPlaying(false);
    };

    const onVideoEnded = () => {
      stopVideo();
    };

    return (
      <motion.div
        className={clsx(
          'overflow-hidden relative cursor-pointer border-glass rounded',
          className
        )}
        style={{
          background: data.dominantColor || '#000'
        }}
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
          {/* 视频只在首次交互后才加载 */}
          {data.videoUrl && videoLoaded && (
            <video
              className={clsx(
                'absolute z-10 top-0 left-0 w-full h-full object-cover',
                isPlaying ? 'block' : 'hidden'
              )}
              onEnded={onVideoEnded}
              onLoadedData={() => {
                // 视频加载完成后，如果用户已经触发了播放，则自动播放
                if (isPlaying && videoRef.current) {
                  videoRef.current.currentTime = 0;
                  videoRef.current.play().catch(() => {
                    setIsPlaying(false);
                  });
                }
              }}
              onCanPlay={() => {
                // 视频可以播放时
              }}
              ref={videoRef}
              muted
              playsInline
              preload="none"
              src={data.videoUrl}
            />
          )}
        </motion.div>

        {/* livephoto 图标 */}
        {data.videoUrl && (
          <div className="absolute top-2 left-2 z-40" onMouseEnter={playVideo}>
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
