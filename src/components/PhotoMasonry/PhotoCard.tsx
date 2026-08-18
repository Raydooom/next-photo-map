'use client';

import { PhotoItem } from '@/types';
import clsx from 'clsx';
import Image from 'next/image';
import { memo, useRef, useState, useCallback } from 'react';
import LivePhotoIndicate from '@/components/modules/LivePhotoIndicate';
import dayjs from 'dayjs';
import {
  formatExposureTime,
  formatFNumber,
  formatFocalLength,
  formatIso,
  formatTakenDate
} from '@/utils/format';
import { motion } from 'motion/react';
import { trailingFadeStyle } from '@/utils/mask';

interface PhotoCardProps {
  data: PhotoItem;
  /** 由 react-photo-album 布局计算出的渲染宽度 */
  width: number;
  /** 由 react-photo-album 布局计算出的渲染高度 */
  height: number;
  className?: string;
  onClick: () => void;
}

export const PhotoCard = memo(
  ({ data, width, height, className, onClick }: PhotoCardProps) => {
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
          'group relative cursor-pointer overflow-hidden w-full',
          // 描边走 outline 而非 border，避免占用布局算出的宽高。
          // 常态压到很淡：照片自带边界，描边只需在深色照片上给一点轮廓暗示
          'outline-1 -outline-offset-1 outline-lab-line/40',
          'hover:outline-lab-accent',
          'transition-[outline-color] duration-300 ease-out',
          className
        )}
        style={{
          background: data.dominantColor || 'rgb(var(--background))',
          aspectRatio: `${width} / ${height}`
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => {
          setIsHovered(false);
          stopVideo();
        }}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
        onClick={onClick}
      >
        {/* 图片 + 视频层 */}
        <motion.div
          className="relative w-full h-full"
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
            width={width}
            height={height}
            src={data.thumbLargeUrl}
            alt={data.filename}
            onLoad={() => setImageLoaded(true)}
          />

          {/* Live Photo 视频（懒加载） */}
          {hasVideo && videoReady && (
            <video
              ref={videoRef}
              className={clsx(
                'absolute inset-0 w-full h-full object-contain z-10 transition-opacity duration-300',
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
              'absolute top-3 left-3 z-10',
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

/**
 * 照片悬浮信息。
 * 只展示对观看者有价值的内容：拍摄地点、时间与参数；
 * 文件名与体积属于文件属性，对浏览者没有意义，故不再显示。
 *
 * 版式两行：标题行是「地点 + 日期」，拍摄参数独占一行。
 * 日期不与参数拼在一起，否则「04.18 / 7mm / f/1.78」全是数字，
 * 挤成一串后读者无法分辨哪段是时间、哪段是参数。
 * 元数据并非每张照片都齐全，因此各块自行降级或省略。
 */
const PhotoCardOverlay = memo(
  ({ data, visible }: { data: PhotoItem; visible: boolean }) => {
    const exif = data.photoExif;

    // 用 '/' 连接：这行是 mono 读数，中文单位会被宽字距拉散
    const takenAt = formatTakenDate(data.takenAt, '/');

    // 标题：地点最具叙事价值，缺失时依次退到相机型号、文件名
    const place = [data.location?.city, data.location?.district]
      .filter(Boolean)
      .join(' · ');
    const title = place || exif?.model || data.filename;

    // 参数各自成项，靠间距分组而不用分隔符，缺失项自动省略
    const iso = formatIso(exif?.iso);
    const specs = [
      formatFocalLength(exif?.focalLength),
      formatFNumber(exif?.fNumber),
      formatExposureTime(exif?.exposureTime),
      iso ? `ISO ${iso}` : ''
    ].filter(Boolean);

    // 完全没有 EXIF 时退回像素尺寸，避免这一行空着
    const readouts =
      specs.length > 0 ? specs : [`${data.width}×${data.height}`];

    return (
      <div
        className={clsx(
          'absolute inset-x-0 bottom-0 z-20',
          'px-4 pb-3 pt-12',
          'bg-gradient-to-t from-black/70 via-black/25 to-transparent',
          'transition-all duration-300 ease-out',
          visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'
        )}
      >
        {/* 日期紧跟标题而非推到行尾：宽图上两者会被拉开到两端，
            读起来是两条无关的信息，挨着才是「地点 + 时间」一句话。
            baseline 对齐：标题是 14px 中文、日期是 11px mono，按基线才齐 */}
        <div className="flex items-baseline gap-2.5">
          {/* min-w-0 让 truncate 在 flex 里生效；不占满剩余空间，日期才能贴着它 */}
          <h4 className="min-w-0 truncate text-sm leading-tight text-lab-on-media [font-variation-settings:'wght'_600]">
            {title}
          </h4>
          {takenAt && (
            <time
              dateTime={dayjs(data.takenAt).format('YYYY-MM-DD')}
              className="lab-mono shrink-0 text-lab-on-media-muted"
            >
              {takenAt}
            </time>
          )}
        </div>

        {/* 参数行溢出时右端淡出，flex 布局下无法用 truncate，
            淡出也比省略号安静，符合读数条的观感 */}
        <div
          className="mt-2 flex items-baseline gap-x-3 overflow-hidden"
          style={trailingFadeStyle}
        >
          {readouts.map((item, index) => (
            <span
              key={index}
              // normal-case 覆盖 lab-mono 的大写：mm / f / s 等单位惯例为小写。
              // 字距收到 0.06em：单项短，0.12em 会让整行过早溢出
              className="lab-mono shrink-0 whitespace-nowrap normal-case tracking-[0.06em] text-lab-on-media-muted"
            >
              {item}
            </span>
          ))}
        </div>
      </div>
    );
  }
);

PhotoCardOverlay.displayName = 'PhotoCardOverlay';
