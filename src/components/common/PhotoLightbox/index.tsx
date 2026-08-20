'use client';

import { Fragment, useCallback, useEffect, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { WheelGesturesPlugin } from 'embla-carousel-wheel-gestures';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronLeft, ChevronRight, Info, X } from 'lucide-react';
import Image from 'next/image';
import clsx from 'clsx';

import { PhotoItem } from '@/types';
import {
  formatExposureTime,
  formatFNumber,
  formatFocalLength,
  formatIso,
  formatTakenDate
} from '@/utils/format';
import { ExtendInfo } from '@/components/modules/ExifInfo';
import { LivePhoto } from '../LivePhoto';
import { Filmstrip } from './Filmstrip';

/**
 * 环境光：把当前照片放大、重度模糊后铺在底层，
 * 提亮饱和度让色彩透出来，再由上面的暗罩压回去。
 *
 * 不用单色主色晕染 —— 那种渐变最亮处正好被照片本体挡住，
 * 只有边缘露得出来，又会被暗角吃掉，等于看不见。
 */
const AMBIENT_LAYER = 'scale-125 object-cover blur-3xl saturate-[1.6]';

/** 环境光透明度。压太高照片就不再是画面里最亮的东西 */
const AMBIENT_OPACITY = 0.55;

/**
 * 照片的尺寸上限，须与画面区的内边距一一对应：
 * 纵向让出 pt-16 与 pb-32（合 12rem）；横向在移动端不留边 ——
 * 那里没有翻页键要避让，屏幕本就窄，让照片占满更值。
 * md 起让出 px-20，给两侧的翻页键腾位置。
 *
 * 用视口单位而非百分比：承载照片的框由图片自身撑开、高度是 auto，
 * 百分比上限无从解析会被忽略，大图就会溢出被裁。
 */
const PHOTO_SIZE = clsx(
  'max-h-[calc(100vh-12rem)]',
  'max-w-[100vw] md:max-w-[calc(100vw-10rem)]'
);

/** 暗角：把视线收向画面中心，四角压深 */
const VIGNETTE =
  'radial-gradient(120% 95% at 50% 45%, transparent 52%, rgba(0,0,0,0.6) 100%)';

/** 两位数序号 */
const pad = (value: number) => String(value).padStart(2, '0');

interface IconButtonProps {
  label: string;
  onClick: () => void;
  /** 处于开启状态，用强调色表示 */
  isActive?: boolean;
  isDisabled?: boolean;
  className?: string;
  children: React.ReactNode;
}

/**
 * 查看器控件。
 * 常态只有图标，悬停才浮出一层淡底 —— 全屏看照片时，
 * 每个带描边的按钮都是一个抢注意力的方框。
 */
function IconButton({
  label,
  onClick,
  isActive = false,
  isDisabled = false,
  className,
  children
}: IconButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isDisabled}
      aria-label={label}
      aria-pressed={isActive || undefined}
      className={clsx(
        'pointer-events-auto flex shrink-0 cursor-pointer items-center justify-center',
        'transition duration-300 ease-out',
        'hover:bg-lab-on-media/10',
        'focus-visible:outline-1 focus-visible:outline-offset-2',
        'focus-visible:outline-lab-on-media',
        isActive
          ? 'text-lab-accent-on-media'
          : 'text-lab-on-media-muted hover:text-lab-on-media',
        'disabled:pointer-events-none disabled:opacity-20',
        className
      )}
    >
      {children}
    </button>
  );
}

interface PhotoLightboxProps {
  photos: PhotoItem[];
  /** 打开时定位到的照片 */
  currentId?: number;
  onClose: () => void;
  /** 切换照片时回调，用于同步地址栏 */
  onSelect?: (item: PhotoItem) => void;
}

/**
 * 照片全屏查看器。
 *
 * 观感取自暗房：画面浮在一片被照片自身主色染开的暗场里，四角压暗收拢视线，
 * 顶部与底部只用渐变承托文字，不划分割线 —— 全屏看图时线框会把画面框死。
 *
 * 信息按照片墙卡片的结构摆放：上方序号与地点，下方日期与拍摄参数，
 * 都常态可见，点进大图后信息反而更少是说不通的。
 */
export function PhotoLightbox({
  photos,
  currentId,
  onClose,
  onSelect
}: PhotoLightboxProps) {
  const [emblaRef, embla] = useEmblaCarousel({ containScroll: false });
  const [thumbsRef, thumbs] = useEmblaCarousel(
    { containScroll: 'keepSnaps', dragFree: true },
    [WheelGesturesPlugin({ forceWheelAxis: 'x' })]
  );

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);

  const current = photos[selectedIndex];

  const onCarouselSelect = useCallback(() => {
    if (!embla) return;

    const index = embla.selectedScrollSnap();
    setSelectedIndex(index);
    setCanPrev(embla.canScrollPrev());
    setCanNext(embla.canScrollNext());
    thumbs?.scrollTo(index);

    const item = photos[index];
    if (item) onSelect?.(item);
  }, [embla, thumbs, photos, onSelect]);

  useEffect(() => {
    if (!embla) return;

    embla.on('select', onCarouselSelect).on('reInit', onCarouselSelect);
    onCarouselSelect();

    return () => {
      embla.off('select', onCarouselSelect).off('reInit', onCarouselSelect);
    };
  }, [embla, onCarouselSelect]);

  // 打开时定位到点击的那张，跳转不带动画
  useEffect(() => {
    if (!embla || currentId === undefined) return;

    const target = photos.findIndex((item) => item.id === currentId);
    if (target !== -1 && embla.selectedScrollSnap() !== target) {
      embla.scrollTo(target, true);
    }
  }, [embla, currentId, photos]);

  // 左右方向键翻页。Esc 关闭由外层 Modal 负责，不在此重复绑定
  useEffect(() => {
    if (!embla) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') embla.scrollPrev();
      else if (event.key === 'ArrowRight') embla.scrollNext();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [embla]);

  // 标题：地点最具叙事价值，缺失时退到相机型号、文件名
  const place = [current?.location?.city, current?.location?.district]
    .filter(Boolean)
    .join(' · ');
  const title = place || current?.photoExif?.model || current?.filename || '';

  const iso = formatIso(current?.photoExif?.iso);
  const specs = [
    formatFocalLength(current?.photoExif?.focalLength),
    formatFNumber(current?.photoExif?.fNumber),
    formatExposureTime(current?.photoExif?.exposureTime),
    iso ? `ISO ${iso}` : ''
  ].filter(Boolean);

  return (
    <div className="relative h-full w-full overflow-hidden bg-lab-ink">
      {/* 环境光。切换照片时交叉淡入，色彩跟着画面内容走 */}
      <AnimatePresence>
        {current && (
          <motion.div
            key={current.id}
            aria-hidden
            className="pointer-events-none absolute inset-0 overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: AMBIENT_OPACITY }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.9, ease: 'easeOut' }}
          >
            {/* 取小图即可：重度模糊之后分辨率没有意义，且胶片条已经加载过 */}
            <Image
              src={current.thumbSmallUrl}
              alt=""
              fill
              sizes="100vw"
              className={AMBIENT_LAYER}
              priority={false}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* 暗罩压住环境光，保证照片仍是画面里最亮、最清晰的部分 */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-lab-ink/45"
      />

      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: VIGNETTE }}
      />

      {/* 画面区铺满，内边距让照片避开上下的渐变承托区与两侧的翻页键 */}
      <div className="absolute inset-0 pb-32 pt-16 md:px-20">
        <div className="h-full overflow-hidden" ref={emblaRef}>
          <div className="flex h-full">
            {photos.map((photo) => (
              <LivePhoto
                key={photo.id}
                photoInfo={photo}
                sizeClassName={PHOTO_SIZE}
              />
            ))}
          </div>
        </div>
      </div>

      {/* 顶部：序号与地点，控件贴右。整层不吃事件，只有按钮自己接管 */}
      <header
        className={clsx(
          'pointer-events-none absolute inset-x-0 top-0 z-10',
          'flex items-start justify-between gap-4 px-4 pb-10 pt-4 md:px-6',
          'bg-gradient-to-b from-black/70 via-black/25 to-transparent'
        )}
      >
        <div className="flex min-w-0 items-baseline gap-2.5">
          {/* 序号放大成读数，与底部的小号 mono 拉开层次 */}
          <span
            className={clsx(
              'text-2xl leading-none tabular-nums tracking-[-0.03em]',
              'text-lab-on-media',
              "[font-variation-settings:'wght'_680]"
            )}
          >
            {pad(selectedIndex + 1)}
          </span>
          <span className="lab-mono shrink-0 text-lab-on-media-muted">
            / {pad(photos.length)}
          </span>
          {title && (
            <h2 className="ml-1.5 truncate text-sm text-lab-on-media/90">
              {title}
            </h2>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <IconButton
            label="拍摄信息"
            onClick={() => setIsInfoOpen((open) => !open)}
            isActive={isInfoOpen}
            className="h-10 w-10"
          >
            <Info className="h-4 w-4" />
          </IconButton>
          <IconButton label="关闭" onClick={onClose} className="h-10 w-10">
            <X className="h-4 w-4" />
          </IconButton>
        </div>
      </header>

      {/* 翻页：分列两侧，常态几近透明，鼠标靠近才浮起来。
          触屏直接横向滑动即可切换，故移动端不占画面显示按钮 */}
      <IconButton
        label="上一张"
        onClick={() => embla?.scrollPrev()}
        isDisabled={!canPrev}
        className="absolute left-4 top-1/2 z-10 hidden h-16 w-12 -translate-y-1/2 opacity-45 hover:opacity-100 md:flex"
      >
        <ChevronLeft className="h-5 w-5" />
      </IconButton>
      <IconButton
        label="下一张"
        onClick={() => embla?.scrollNext()}
        isDisabled={!canNext}
        className="absolute right-4 top-1/2 z-10 hidden h-16 w-12 -translate-y-1/2 opacity-45 hover:opacity-100 md:flex"
      >
        <ChevronRight className="h-5 w-5" />
      </IconButton>

      {/* 底部：日期与拍摄参数，下接胶片条 */}
      <footer
        className={clsx(
          // 整层不吃事件，否则底部渐变区会挡住照片的拖拽
          'pointer-events-none absolute inset-x-0 bottom-0 z-10',
          'bg-gradient-to-t from-black/80 via-black/45 to-transparent pt-12'
        )}
      >
        <div className="flex h-10 flex-wrap items-center justify-between gap-x-6 px-4 md:px-6">
          <span className="lab-mono tabular-nums text-lab-on-media-muted">
            {formatTakenDate(current?.takenAt, '/')}
          </span>

          {specs.length > 0 && (
            <div className="flex items-center gap-x-2.5 overflow-hidden">
              {specs.map((item, index) => (
                <Fragment key={item}>
                  {/* 细竖线分隔，比空格更有读数条的秩序感 */}
                  {index > 0 && (
                    <span
                      aria-hidden
                      className="h-2.5 w-px shrink-0 bg-lab-on-media/25"
                    />
                  )}
                  {/* normal-case 覆盖 lab-mono 的大写：mm / f / s 惯例为小写 */}
                  <span className="lab-mono shrink-0 whitespace-nowrap normal-case tracking-[0.06em] text-lab-on-media-muted">
                    {item}
                  </span>
                </Fragment>
              ))}
            </div>
          )}
        </div>

        <div className="pointer-events-auto mt-2">
          <Filmstrip
            photos={photos}
            selectedIndex={selectedIndex}
            emblaRef={thumbsRef}
            onSelect={(index) => embla?.scrollTo(index)}
          />
        </div>
      </footer>

      {/* 详细信息面板 */}
      <AnimatePresence>
        {isInfoOpen && current && (
          <motion.div
            className="absolute right-4 top-16 z-20 md:right-6"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 12, transition: { duration: 0.15 } }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          >
            <ExtendInfo photo={current} setIsOpen={setIsInfoOpen} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
