import type { PhotoItem } from '@/types';
import { Image } from '@heroui/image';
import { useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import clsx from 'clsx';
import LivePhotoIndicate from '@/components/modules/LivePhotoIndicate';

// 与照片墙卡片共用同一个实况标记，避免两处样式各自漂移
export { LivePhotoIndicate };

export const LivePhoto = ({
  photoInfo,
  imageFit = 'contain',
  disableLive = false,
  sizeClassName,
  frameClassName
}: {
  photoInfo: PhotoItem;
  imageFit?: 'contain' | 'cover';
  disableLive?: boolean;
  /**
   * contain 模式下图片的尺寸上限，须用视口等非百分比单位表达，
   * 例如 `max-h-[calc(100vh-12rem)]`。
   *
   * 原因见下方画面框的说明：框的高度由图片撑开，是 auto，
   * 此时百分比上限无从解析会被浏览器忽略，大图便会溢出。
   */
  sizeClassName?: string;
  /**
   * 画面框的附加样式，用于描边与投影这类作用在照片轮廓上的效果。
   *
   * 之所以不并进 sizeClassName 挂到图片上：那里是 heroui 的 Image，
   * 内部会用 tailwind-variants 合并类名，shadow 之类容易被它自己的
   * 规则消掉；而画面框是本组件的原生 div，尺寸又恰好等于照片，
   * 效果落在它身上更可靠。
   */
  frameClassName?: string;
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

  const isCover = imageFit === 'cover';

  return (
    <div
      className="flex-[0_0_100%] flex h-full items-center justify-center overflow-hidden"
      key={photoInfo.id}
    >
      {/* 画面框。
          contain 时由图片本身撑开（w-fit + 图片按上限等比缩放），
          因此框的尺寸就是照片的实际显示尺寸，不依赖数据库里的宽高 ——
          那份数据可能与图片方向不一致（历史记录未按 EXIF 方向校正）。
          叠加层用 inset-0 拉伸到框的四边，与照片严格对齐。 */}
      <div
        className={clsx(
          'relative',
          isCover ? 'h-full w-full' : 'w-fit',
          frameClassName
        )}
      >
        <Image
          removeWrapper
          radius="none"
          src={photoInfo.thumbLargeUrl}
          alt={photoInfo.filename}
          className={clsx(
            'block',
            isCover ? 'h-full w-full object-cover' : sizeClassName
          )}
        />

        {photoInfo.videoUrl && !disableLive && (
          <>
            {/* 只用 inset-0 而不用 h-full/w-full：框高是 auto，
                百分比高度会失效，而绝对定位的四边拉伸不受此影响 */}
            {showVideo && (
              <video
                className="absolute inset-0 z-10 object-contain"
                onEnded={onVideoEnded}
                ref={videoRef}
                muted={true}
                src={photoInfo.videoUrl}
              />
            )}
            {/* 鼠标掠过即播放，与照片墙卡片的手感一致；
                onClick 留给触屏。播放中重复触发会被 playVideo 挡掉，
                中途移开也不打断，让这一段实况放完 */}
            <div
              className="absolute left-3 top-3 z-20 cursor-pointer"
              onMouseEnter={playVideo}
              onClick={playVideo}
            >
              <LivePhotoIndicate isPlaying={isPlaying} />
            </div>
          </>
        )}
      </div>
    </div>
  );
};
