'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import clsx from 'clsx';

import { PhotoItem } from '@/types';
import { FullscreenDialog } from '@/components/ui';
import { IconButton } from '@/components/common/PhotoLightbox/IconButton';
import { LivePhoto } from '@/components/common/LivePhoto';
import { MetaColumn } from './MetaColumn';
import { Thumbs } from './Thumbs';

/** 参数栏宽度（宽屏），与下面尺寸算式里的 21rem 对应 */
const META_WIDTH = 'wide:w-[336px]';

/**
 * 照片的尺寸上限。
 *
 * 必须用视口单位而非百分比：LivePhoto 的画面框由图片自身撑开、高度是
 * auto，此时百分比上限无从解析会被浏览器忽略，大图就会溢出被裁。
 * 也因此每一档都写成完整字面量 —— Tailwind 靠静态扫描收类名，
 * 拼接出来的类名它读不到。
 *
 * 各项扣减的来源：
 *   宽屏  外层 p-8 上下 4rem ／ 画面区 p-6 上下 3rem ／ 缩略图条 4.75rem
 *         ／ 再让 1rem 给投影（LivePhoto 根元素 overflow-hidden，
 *         照片顶满时投影会被裁成硬边）
 *   紧凑  画面区占 58dvh（参数栏拿 42dvh）／ p-3 上下 1.5rem
 *         ／ 缩略图条 4rem
 * 横向同理：宽屏要让出参数栏 21rem 与两侧留白，紧凑布局只让出 p-3。
 */
const PHOTO_SIZE_WITH_THUMBS = clsx(
  'max-h-[calc(50dvh-5.5rem)] wide:max-h-[calc(100dvh-12.75rem)]',
  'max-w-[calc(100vw-1.5rem)] wide:max-w-[min(796px,calc(100vw-26rem))]'
);

const PHOTO_SIZE_SINGLE = clsx(
  'max-h-[calc(50dvh-2.5rem)] wide:max-h-[calc(100dvh-8rem)]',
  'max-w-[calc(100vw-1.5rem)] wide:max-w-[min(796px,calc(100vw-26rem))]'
);

/**
 * 照片自身的边界。
 *
 * 亮色下画面区是浅灰台面，浅色照片（雪地、天空）的边缘会直接融进去，
 * 照片就"塌"在底上，故补一层极淡描边与一组贴边投影交代轮廓与厚度。
 * 投影的扩散压在 10px 以内，PHOTO_SIZE 让出的 1rem 才接得住。
 *
 * 暗色不用：照片自带亮度优势，天然从暗场里浮出来，
 * 再加投影只会在深底上糊出一团脏影。
 */
const PHOTO_SURFACE = clsx(
  'ring-1 ring-black/[0.07]',
  'shadow-[0_1px_2px_rgba(0,0,0,0.09),0_4px_10px_-3px_rgba(0,0,0,0.14)]',
  'dark:ring-0 dark:shadow-none'
);

interface TraceViewerProps {
  photos: PhotoItem[];
  /** 初始显示哪一张 */
  currentId?: number;
  isOpen: boolean;
  onClose: () => void;
  /** 翻页时回调，供外部同步地址栏 */
  onSelect?: (photo: PhotoItem) => void;
}

/**
 * 足迹页的照片查看器。
 *
 * 与照片墙那套刻意分开，因为两处要回答的问题不同。照片墙是浏览流，
 * 画面是主角、参数按需展开，故那边做成沉浸式全屏 —— 环境光、暗角、
 * 承托渐变都为"只剩照片"服务。这里是从地图某个点位点进来的查阅，
 * 读者手上正拿着"这是哪儿、什么时候、用什么拍的"这条线索，
 * 参数与照片同等重要，藏进抽屉反而多一次点击。
 *
 * 于是形态改成一块居中的面板：左边照片、右边参数常驻，打开即见。
 * 宽屏刻意不铺满视口，四周露出一圈地图 —— 读者知道自己没有离开那张图，
 * 关掉就回到原处。紧凑布局下没有这个余裕，铺满，参数退到照片下方。
 */
export function TraceViewer({
  photos,
  currentId,
  isOpen,
  onClose,
  onSelect
}: TraceViewerProps) {
  const initialIndex = useMemo(() => {
    const found = photos.findIndex((item) => item.id === currentId);
    return found < 0 ? 0 : found;
  }, [photos, currentId]);

  const [index, setIndex] = useState(initialIndex);

  /**
   * 每次打开都回到入口那一张。
   * 只认 isOpen 的变化 —— 打开期间 index 由翻页自行推进，
   * 若跟着 initialIndex 走，外部把 photoId 同步回来时会与翻页互相打断。
   */
  useEffect(() => {
    if (isOpen) setIndex(initialIndex);
  }, [isOpen]);

  const total = photos.length;
  const photo = photos[index];
  const hasThumbs = total > 1;

  const goTo = useCallback(
    (next: number) => {
      if (total === 0) return;
      // 环形翻页：到头接回另一端，省去禁用态
      const target = (next + total) % total;
      setIndex(target);
      onSelect?.(photos[target]);
    },
    [photos, total, onSelect]
  );

  /** 左右方向键翻页。Esc 由对话框自己处理 */
  useEffect(() => {
    if (!isOpen || total <= 1) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') goTo(index - 1);
      if (event.key === 'ArrowRight') goTo(index + 1);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, total, index, goTo]);

  if (!photo) return null;

  return (
    <FullscreenDialog isOpen={isOpen} onClose={onClose} label="足迹照片查看器">
      {/* 外层负责居中，并在宽屏留出四周的地图余白 */}
      <div className="flex h-full w-full items-center justify-center wide:p-8">
        <div
          className={clsx(
            'flex h-full w-full flex-col overflow-hidden',
            /**
             * 宽高都固定，不随照片尺寸变。
             *
             * 原先宽度是 w-auto、由照片撑开，于是横幅一张宽、竖幅一张窄，
             * 翻页时整块面板跟着照片忽宽忽窄地跳。固定下来之后画面区尺寸恒定，
             * 竖图就在其中居中、两侧留空 —— 留白比跳动好。
             *
             * max-w-full 兜住窄窗口：视口不足 1180 加两侧留白时面板随之收缩，
             * 照片尺寸上限里的 calc(100vw-26rem) 那一项与它配套。
             */
            'wide:h-[calc(100dvh-4rem)] wide:w-[1180px] wide:max-w-full wide:flex-row',
            'bg-lab-raised',
            /**
             * 亮色靠投影浮起，暗色靠描边划界。
             *
             * 暗色下投影落在深底上本就看不见，而面板（0.185）与遮罩压过的
             * 地图（0.145 再乘两成）虽有亮度差，一旦落到画面区那圈内边距上，
             * 面积太小就读不出边界，整块面板于是与背后连成一片。
             * 补一圈淡白描边，轮廓才立得住。
             *
             * 用 ring 而非 inset ring：面板的两个子区各有实底且铺满，
             * 内描边会被它们盖掉。
             */
            'shadow-[0_8px_24px_-8px_rgba(0,0,0,0.14),0_32px_72px_-24px_rgba(0,0,0,0.22)]',
            'dark:shadow-none dark:ring-1 dark:ring-lab-on-media/15'
          )}
        >
          {/**
           * 画面区。
           *
           * 底色比面板沉一档，把照片托出来。紧凑布局下高度写死 50dvh，
           * 余下的一半归参数栏 —— 照片尺寸上限要按这个值反推，
           * 交给 flex 弹性分配的话就没有可用视口单位可写了。
           *
           * 从 58dvh 让到 50dvh：这一页的用意是"打开即见参数"，
           * 而参数摊开约需 450px，手机上 42dvh 只有三百多，一开就得滚。
           * 对半分之后配合参数栏自身收紧的排布，常见情形一屏能收完。
           */}
          <div
            className={clsx(
              'relative flex h-[50dvh] shrink-0 flex-col wide:h-auto wide:min-h-0 wide:flex-1',
              /**
               * 两个主题都取 sunken，即"比面板沉一档"。
               * 暗色原先用 lab-ink（0.145），那正是地图的底色，画面区于是
               * 与背景同色；换成 sunken（0.115）既比参数栏（0.185）明显更沉，
               * 面板内部的层次也读得出来。
               */
              'bg-lab-sunken'
            )}
          >
            <div className="relative flex min-h-0 flex-1 items-center justify-center p-3 wide:p-6">
              <LivePhoto
                key={photo.id}
                photoInfo={photo}
                sizeClassName={
                  hasThumbs ? PHOTO_SIZE_WITH_THUMBS : PHOTO_SIZE_SINGLE
                }
                frameClassName={PHOTO_SURFACE}
              />

              {/* 翻页键压在照片区的内边距上。z-20 是为了盖过 LivePhoto
                  播放实况时铺开的那层 z-10 视频 */}
              {hasThumbs && (
                <>
                  <IconButton
                    label="上一张"
                    onClick={() => goTo(index - 1)}
                    className="absolute left-1 top-1/2 z-20 h-11 w-11 -translate-y-1/2"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </IconButton>
                  <IconButton
                    label="下一张"
                    onClick={() => goTo(index + 1)}
                    className="absolute right-1 top-1/2 z-20 h-11 w-11 -translate-y-1/2"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </IconButton>
                </>
              )}
            </div>

            <Thumbs
              photos={photos}
              selectedIndex={index}
              onSelect={(next) => goTo(next)}
            />
          </div>

          {/**
           * 参数栏。
           * 宽屏靠右竖排、固定宽度；紧凑布局退到照片下方占 42dvh，
           * 内部自行滚动 —— 手机上并排放不下，而参数又不该把照片挤成一条。
           *
           * 不设标题行。原先那行放"第几张 / 共几张"，但单张时 01/01 是废话，
           * 多张时缩略图条已经点亮了当前那一格，序号只是把同一件事说第二遍。
           * 这一栏从内容直接起头，省下的高度归参数。
           */}
          <div
            className={clsx(
              'relative flex min-h-0 flex-1 flex-col border-t border-lab-line',
              'wide:flex-none wide:border-l wide:border-t-0',
              META_WIDTH
            )}
          >
            {/**
             * 关闭按钮落在参数栏，不压照片 —— 画面区那点内边距容不下它，
             * 44px 的按钮摆上去就盖住了画面一角。
             *
             * 绝对定位而不单独占一行：一整行只为一个按钮太浪费，
             * 而它与首个段落标题（Where & When）一左一右，本就不打架。
             */}
            <IconButton
              label="关闭"
              onClick={onClose}
              className="absolute right-1.5 top-1.5 z-10 h-11 w-11 wide:right-2 wide:top-2 wide:h-9 wide:w-9"
            >
              <X className="h-[18px] w-[18px]" />
            </IconButton>

            <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-5 py-5">
              <MetaColumn photo={photo} />
            </div>
          </div>
        </div>
      </div>
    </FullscreenDialog>
  );
}
