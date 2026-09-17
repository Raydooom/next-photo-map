'use client';

import { Fragment, useCallback, useEffect, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { WheelGesturesPlugin } from 'embla-carousel-wheel-gestures';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronLeft, ChevronRight, Info, X } from 'lucide-react';
import Image from 'next/image';
import clsx from 'clsx';

import { PhotoItem } from '@/lib/types';
import {
  formatExposureTime,
  formatFNumber,
  formatFocalLength,
  formatIso,
  formatTakenDate
} from '@/lib/format';
import { LivePhoto } from '../LivePhoto';
import { Filmstrip } from './Filmstrip';
import { IconButton } from './IconButton';
import { InfoPanel } from './InfoPanel';

/**
 * 环境光：当前照片放大、重度模糊后铺在底层，提亮饱和度再由上面的暗罩压回去。
 *
 * 只用于暗色。亮色下试过压向浅场，但模糊后的色调糊在纯白上会发脏
 * （绿调照片泛出一片脏绿），调低不透明度也去不掉 —— 与白底的干净感互斥。
 */
const AMBIENT_LAYER = 'scale-125 object-cover blur-3xl saturate-[1.6]';

/** 环境光透明度。压太高照片就不再是画面里最亮的东西 */
const AMBIENT_OPACITY = 0.55;

/**
 * 照片的尺寸上限，与画面区的内边距一一对应，取到刚好铺满可用空间。
 *
 * 写成完整字面量而非拼接：Tailwind 靠静态扫描收类名，拼接的读不到。
 * 用视口单位而非百分比：承载照片的框由图片撑开、高度是 auto，
 * 百分比上限无从解析会被忽略，大图就溢出被裁。
 */
const PHOTO_SIZE = clsx(
  // dvh 而非 vh：移动端 100vh 含地址栏高度，照片会高出可视范围被裁。
  //
  // 纵向比 chrome 的占位再让出 2.5rem（每侧 20px）给投影：embla 的视口与每张
  // slide 都必须 overflow-hidden，照片顶满时投影会被裁成硬边。20px 对最远一层
  // 的 15px 扩散尚有余量。紧凑 = pt-15 + pb-31 + 2.5rem；宽屏 = pt-14 + pb-30 + 2.5rem
  //
  // 横向在紧凑布局下直接铺满：投影落到屏幕之外，裁切边界与屏幕边缘重合，
  // 看不出硬边。宽屏让出 px-18 给翻页键，再加 2.5rem 投影余地。
  'max-h-[calc(100dvh-14rem)] wide:max-h-[calc(100dvh-13.5rem)]',
  'max-w-[100vw] wide:max-w-[calc(100vw-11.5rem)]'
);

/**
 * 照片自身的边界与投影。亮色下浅色照片（天空、雪地）的边缘会融进纯白底，
 * 故补描边交代轮廓、分层投影托出厚度。暗色不用，照片自带亮度优势。
 *
 * 三层各管一段距离：1px 是接触阴影（缺了它照片像印在底上），10px 与 22px
 * 给悬浮感。单层要么近而生硬、要么远而发灰。
 *
 * 扩散必须落在 PHOTO_SIZE 留出的间隙（每侧 24px）内 —— embla 的视口与
 * slide 都是 overflow-hidden，超出会被裁成硬边。最远一层实际约
 * 22/2 + 12 - 8 = 15px。y 偏移都小于模糊半径，让投影环绕而非向下拖，
 * 免得糊进底部读数。
 *
 * 作用在画面框而非图片元素上，见 LivePhoto 的 frameClassName 说明。
 */
const PHOTO_SURFACE = clsx(
  'ring-1 ring-black/[0.08]',
  'shadow-[0_1px_2px_rgba(0,0,0,0.10),0_5px_10px_-2px_rgba(0,0,0,0.13),0_12px_22px_-8px_rgba(0,0,0,0.20)]',
  'dark:ring-0 dark:shadow-none'
);

/** 暗角：把视线收向画面中心，四角压深。只用于暗色，理由同环境光 */
const VIGNETTE =
  'radial-gradient(120% 95% at 50% 45%, transparent 52%, rgba(0,0,0,0.6) 100%)';

/**
 * 顶部 / 底部的承托渐变，只用于暗色，托住悬浮的文字与控件。
 *
 * 不用 Tailwind 的 from/via/to：三个色标时 alpha 是纯线性插值，中段会留下
 * 看得出的硬边，故用多段色标逼近缓动曲线（lib/mask.ts 里同一问题同一处理）。
 * 承托层还单独拆成一块比文字更高的独立层，让过渡有更长距离收尾。
 * 底部比顶部略深：它还要托住胶片条。
 *
 * 亮色不需要：纯白底上深色文字对比度已够，垫任何一层都会留下可见边界。
 */
const TOP_SCRIM = `linear-gradient(to bottom,
  rgba(0, 0, 0, 0.72) 0%,
  rgba(0, 0, 0, 0.58) 22%,
  rgba(0, 0, 0, 0.4) 42%,
  rgba(0, 0, 0, 0.22) 62%,
  rgba(0, 0, 0, 0.09) 82%,
  transparent 100%)`;

const BOTTOM_SCRIM = `linear-gradient(to top,
  rgba(0, 0, 0, 0.82) 0%,
  rgba(0, 0, 0, 0.66) 22%,
  rgba(0, 0, 0, 0.46) 42%,
  rgba(0, 0, 0, 0.26) 62%,
  rgba(0, 0, 0, 0.11) 82%,
  transparent 100%)`;

/** 两位数序号 */
const pad = (value: number) => String(value).padStart(2, '0');

interface PhotoLightboxProps {
  photos: PhotoItem[];
  /** 打开时定位到的照片 */
  currentId?: number;
  onClose: () => void;
  /** 切换照片时回调，用于同步地址栏 */
  onSelect?: (item: PhotoItem) => void;
}

/**
 * 照片全屏查看器。两个主题是同一结构的两种光照条件，而非两套界面。
 *
 * 暗色取自暗房：画面浮在被照片主色染开的暗场里，四角压暗收拢视线，
 * 顶底用渐变承托文字、不划分割线（线框会把画面框死）。
 * 亮色则关掉全部氛围层（环境光/暗罩/暗角/承托渐变）—— 它们铺在纯白底上
 * 都会留下脏色或可见边界，层次改由照片自身的描边与投影建立。
 *
 * 信息按照片墙卡片的结构摆放，上序号地点、下日期参数，均常态可见。
 */
export function PhotoLightbox({
  photos,
  currentId,
  onClose,
  onSelect
}: PhotoLightboxProps) {
  // 只在挂载时算一次：查看器由外层 AnimatePresence 整体卸载重挂，每次打开都是
  // 全新实例。currentId 后续变化交由下方 effect 处理
  const [initialIndex] = useState(() => {
    if (currentId === undefined) return 0;
    const index = photos.findIndex((item) => item.id === currentId);
    return index === -1 ? 0 : index;
  });

  // startIndex 让 embla 挂载时就落在目标位置，而不是先落在第 0 张、
  // 再靠 effect 跳转 —— 否则共享布局动画会先短暂对上错误的那一张卡片
  const [emblaRef, embla] = useEmblaCarousel({
    containScroll: false,
    startIndex: initialIndex
  });
  const [thumbsRef, thumbs] = useEmblaCarousel(
    { containScroll: 'keepSnaps', dragFree: true, startIndex: initialIndex },
    [WheelGesturesPlugin({ forceWheelAxis: 'x' })]
  );

  const [selectedIndex, setSelectedIndex] = useState(initialIndex);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);

  const current = photos[selectedIndex];

  /** 把轮播的当前位置同步到组件状态与缩略图条，不涉及外部副作用 */
  const syncFromCarousel = useCallback(() => {
    if (!embla) return;

    const index = embla.selectedScrollSnap();
    setSelectedIndex(index);
    setCanPrev(embla.canScrollPrev());
    setCanNext(embla.canScrollNext());
    thumbs?.scrollTo(index);
  }, [embla, thumbs]);

  /** 用户切到了另一张：除同步状态外，还要把当前照片报给外部（用于写地址栏） */
  const handleCarouselSelect = useCallback(() => {
    if (!embla) return;

    syncFromCarousel();

    const item = photos[embla.selectedScrollSnap()];
    if (item) onSelect?.(item);
  }, [embla, syncFromCarousel, photos, onSelect]);

  useEffect(() => {
    if (!embla) return;

    /**
     * select 与 reInit 必须分开：reInit 由容器尺寸变化触发（embla 内部有
     * ResizeObserver），照片没换，故只同步状态、不回调 onSelect。否则关闭时
     * 对话框的退场动画会缩放容器引发 reInit，刚清掉的 photoId 又被写回地址栏
     * （表现为"点了关闭但参数还在"）。退场期间组件仍挂载，拦不住这次回调。
     *
     * 挂载时同理只同步状态：打开时的 photoId 已由调用方写好。
     */
    embla.on('select', handleCarouselSelect).on('reInit', syncFromCarousel);
    syncFromCarousel();

    return () => {
      embla.off('select', handleCarouselSelect).off('reInit', syncFromCarousel);
    };
  }, [embla, handleCarouselSelect, syncFromCarousel]);

  // 兜底：查看器打开期间 currentId 若发生变化（如外部改了地址栏的 photoId），
  // 跟着跳转，不带动画。首次定位已由 embla 的 startIndex 处理，不走这里
  useEffect(() => {
    if (!embla || currentId === undefined) return;

    const target = photos.findIndex((item) => item.id === currentId);
    if (target !== -1 && embla.selectedScrollSnap() !== target) {
      embla.scrollTo(target, true);
    }
  }, [embla, currentId, photos]);

  // 左右方向键翻页。Esc 关闭与 Tab 循环由外层对话框负责，不在此重复绑定
  useEffect(() => {
    if (!embla) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') embla.scrollPrev();
      else if (event.key === 'ArrowRight') embla.scrollNext();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [embla]);

  // 地点与日期同属"何时何地"，一起放在底栏左侧；缺失则整段不显示
  const place = [current?.location?.city, current?.location?.district]
    .filter(Boolean)
    .join(' · ');

  // 机身型号领起这组读数：先交代"用什么拍的"，再是"怎么拍的"
  const model = current?.photoExif?.model;

  const iso = formatIso(current?.photoExif?.iso);
  const specs = [
    formatFocalLength(current?.photoExif?.focalLength),
    formatFNumber(current?.photoExif?.fNumber),
    formatExposureTime(current?.photoExif?.exposureTime),
    iso ? `ISO ${iso}` : ''
  ].filter(Boolean);

  return (
    /**
     * 底色全局统一、不按区域切色块。层次交给照片自身的描边与投影
     * （见 PHOTO_SURFACE）—— 白配浅灰的分区色差不足以成为层次，
     * 却足以露出接缝，把界面切成几条横带。
     */
    <div className="relative h-full w-full overflow-hidden bg-lab-raised dark:bg-lab-viewer-ink">
      {/* 环境光、暗罩、暗角：只在暗色渲染 */}
      <div className="hidden dark:contents">
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

        {/* 暗罩压住环境光，保证照片仍是画面里最清晰的部分 */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-lab-viewer-ink/45"
        />

        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ background: VIGNETTE }}
        />
      </div>

      {/* 画面区铺满，内边距让照片避开顶栏文字、底部读数与胶片条、两侧翻页键。
          取值贴着这些元素的实际高度，照片可以压在它们的留白上，只避开实体内容：
          顶栏 = pt-4 + 控件（移动端 44px / 桌面 40px）；
          底部 = 读数行（44 / 40）+ mt-2 8px + 胶片条 72px；
          横向仅桌面需要让位，移动端不显示翻页键 */}
      <div className="absolute inset-0 pb-31 pt-15 wide:pb-30 wide:pt-14 wide:px-18">
        <div className="h-full overflow-hidden" ref={emblaRef}>
          <div className="flex h-full">
            {photos.map((photo) => (
              <LivePhoto
                key={photo.id}
                photoInfo={photo}
                sizeClassName={PHOTO_SIZE}
                frameClassName={PHOTO_SURFACE}
              />
            ))}
          </div>
        </div>
      </div>

      {/* 承托层：只在暗色渲染，亮色不需要渐变来保证可读 ——
          下面 header 自己就有实底白，直接盖住舞台灰，边界靠色差而非渐变 */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 z-10 hidden h-40 dark:block"
        style={{ background: TOP_SCRIM }}
      />

      {/* 顶部：序号与控件。整层不吃事件，只有按钮自己接管。
          不给背景色 —— 亮色下文字直接压在白底上对比度就够，
          暗色则由上面的渐变承托层负责 */}
      <header
        className={clsx(
          'pointer-events-none absolute inset-x-0 top-0 z-10',
          'flex items-start justify-between gap-4 px-4 pt-4 wide:px-6'
        )}
      >
        {/* 顶栏只留序号：地点已随日期移到底栏，那里才是"何时何地"该在的位置 */}
        <div className="flex min-w-0 items-baseline gap-2.5">
          {/* 序号放大成读数，与底部的小号 mono 拉开层次 */}
          <span
            className={clsx(
              'text-2xl leading-none tabular-nums tracking-[-0.03em]',
              'text-lab-paper dark:text-lab-on-media',
              "[font-variation-settings:'wght'_680]"
            )}
          >
            {pad(selectedIndex + 1)}
          </span>
          <span className="lab-mono shrink-0 text-lab-muted dark:text-lab-on-media-muted">
            / {pad(photos.length)}
          </span>
        </div>

        {/* 顶栏只留关闭：拍摄信息的入口移到了底栏那组参数的末尾，
            与它展开的内容在同一处。
            移动端放到 44px —— 触屏的最小触控目标，桌面有鼠标精度可以收紧 */}
        <IconButton
          label="关闭"
          onClick={onClose}
          className="-mr-1.5 h-11 w-11 wide:mr-0 wide:h-10 wide:w-10"
        >
          <X className="h-5 w-5" />
        </IconButton>
      </header>

      {/* 翻页：分列两侧，常态几近透明，鼠标靠近才浮起来。
          触屏直接横向滑动即可切换，故移动端不占画面显示按钮 */}
      <IconButton
        label="上一张"
        onClick={() => embla?.scrollPrev()}
        isDisabled={!canPrev}
        className="absolute left-4 top-1/2 z-10 hidden h-16 w-12 -translate-y-1/2 opacity-45 hover:opacity-100 wide:flex"
      >
        <ChevronLeft className="h-6 w-6" />
      </IconButton>
      <IconButton
        label="下一张"
        onClick={() => embla?.scrollNext()}
        isDisabled={!canNext}
        className="absolute right-4 top-1/2 z-10 hidden h-16 w-12 -translate-y-1/2 opacity-45 hover:opacity-100 wide:flex"
      >
        <ChevronRight className="h-6 w-6" />
      </IconButton>

      {/* 承托层同上，独立于底部内容，向上多探出一截；同样只在暗色渲染 */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 z-10 hidden h-52 dark:block"
        style={{ background: BOTTOM_SCRIM }}
      />

      {/* 底部：日期与拍摄参数，下接胶片条。同上不给背景色 */}
      <footer
        className={clsx(
          // 整层不吃事件，否则底部渐变区会挡住照片的拖拽
          'pointer-events-none absolute inset-x-0 bottom-0 z-10 pt-12'
        )}
      >
        {/* 拍摄信息：贴右下角，从触发它的按钮上方展开。
            面板自带宽度与右边距，这里只负责进出场 */}
        <AnimatePresence>
          {isInfoOpen && current && (
            <motion.div
              className="mb-2"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16, transition: { duration: 0.16 } }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            >
              <InfoPanel photo={current} onClose={() => setIsInfoOpen(false)} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* 读数行随移动端 44px 的按钮一起加高，桌面回到 40px */}
        <div className="flex h-11 items-center justify-between gap-x-6 px-4 wide:h-10 wide:px-6">
          {/* 日期与地点。不套 lab-mono —— 中文会被那 0.12em 的宽字距拉散，
              日期取中文写法（formatTakenDate 不传分隔符即为中文，跨年自动补年份），
              与后面的中文地名同一套字形才连得起来 */}
          <div
            className={clsx(
              'flex min-w-0 items-baseline gap-2 text-[12px]',
              'text-lab-muted dark:text-lab-on-media-muted'
            )}
          >
            <span className="shrink-0">
              {formatTakenDate(current?.takenAt)}
            </span>
            {place && (
              <>
                <span
                  aria-hidden
                  className="shrink-0 text-lab-faint dark:text-lab-on-media-muted/50"
                >
                  ·
                </span>
                <span className="truncate">{place}</span>
              </>
            )}
          </div>

          {/* 参数与详情入口整体不收缩，宽度不够时先截断左侧的地点 */}
          <div className="flex shrink-0 items-center gap-x-2.5">
            {/* 手机屏放不下这一串，会把日期地点挤成一个孤零零的间隔点，
                故只留详情按钮，完整参数点开面板去看。
                这里按 md 而非 wide 判断：平板竖屏虽然纵向紧张（布局仍走紧凑那套），
                横向却有足够空间摆下型号与四项参数 */}
            <div className="hidden items-center gap-x-2.5 md:flex">
              {model && (
                <>
                  <span
                    className={clsx(
                      'shrink-0 whitespace-nowrap text-[13px]',
                      'text-lab-paper dark:text-lab-on-media',
                      "[font-variation-settings:'wght'_620]"
                    )}
                  >
                    {model}
                  </span>
                  {/* 这条线两侧各留 2px，比参数彼此之间的间隔更宽，
                      把"设备"与"参数"分成两组读 */}
                  <span
                    aria-hidden
                    className="mx-0.5 h-2.5 w-px shrink-0 bg-lab-line-strong dark:bg-lab-on-media/25"
                  />
                </>
              )}

              {specs.map((item, index) => (
                <Fragment key={item}>
                  {/* 细竖线分隔，比空格更有读数条的秩序感 */}
                  {index > 0 && (
                    <span
                      aria-hidden
                      className="h-2.5 w-px shrink-0 bg-lab-line-strong dark:bg-lab-on-media/25"
                    />
                  )}
                  {/* normal-case 覆盖 lab-mono 的大写：mm / f / s 惯例为小写 */}
                  <span className="lab-mono shrink-0 whitespace-nowrap normal-case tracking-[0.06em] text-lab-muted dark:text-lab-on-media-muted">
                    {item}
                  </span>
                </Fragment>
              ))}
            </div>

            {/* 详情入口接在这组参数之后：它展开的正是这些参数的完整版，
                按钮与内容同处一行的延长线上。
                桌面收到 32px 与 11px 的读数文字配重；移动端要够点，
                放到 44px，并让它纵向溢出读数行而不撑高整条 */}
            <IconButton
              label="拍摄信息"
              onClick={() => setIsInfoOpen((open) => !open)}
              isActive={isInfoOpen}
              className="-mr-2 ml-0.5 h-11 w-11 wide:-mr-1.5 wide:h-8 wide:w-8"
            >
              <Info className="h-[18px] w-[18px] wide:h-4 wide:w-4" />
            </IconButton>
          </div>
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
    </div>
  );
}
