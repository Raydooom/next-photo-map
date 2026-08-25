"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, ChevronUp, X } from "lucide-react";
import clsx from "clsx";

import { PhotoItem } from "@/types";
import { formatTakenDate } from "@/utils/format";
import { extractPhotoMeta } from "@/utils/photoMeta";
import { FocusLoader, FullscreenDialog } from "@/components/ui";
import { IconButton } from "@/components/common/PhotoLightbox/IconButton";
import { LivePhoto } from "@/components/common/LivePhoto";
import { MetaColumn } from "./MetaColumn";
import { Thumbs } from "./Thumbs";

/** 参数栏宽度（宽屏），与下面尺寸算式里的 21rem 对应 */
const META_WIDTH = "wide:w-[336px]";

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
 *   紧凑  抽屉收起时画面区占满面板，只让出 3rem 给把手；
 *         抽屉拉开后画面区只剩 42dvh（面板 100dvh 减去抽屉的 58dvh），
 *         照片须跟着缩，否则下半截会被抽屉压住
 *         ／ p-3 上下 1.5rem ／ 缩略图条 4rem
 * 横向同理：宽屏要让出参数栏 21rem 与两侧留白，紧凑布局只让出 p-3。
 */
const PHOTO_MAX_W =
  "max-w-[calc(100vw-1.5rem)] wide:max-w-[min(796px,calc(100vw-26rem))]";

/** 四种情形：抽屉是否拉开 × 是否有缩略图条。宽屏那一档不受抽屉影响 */
const PHOTO_SIZE = {
  openWithThumbs: clsx(
    "max-h-[calc(42dvh-5.5rem)] wide:max-h-[calc(100dvh-12.75rem)]",
    PHOTO_MAX_W,
  ),
  openSingle: clsx(
    "max-h-[calc(42dvh-1.5rem)] wide:max-h-[calc(100dvh-8rem)]",
    PHOTO_MAX_W,
  ),
  closedWithThumbs: clsx(
    "max-h-[calc(100dvh-8.5rem)] wide:max-h-[calc(100dvh-12.75rem)]",
    PHOTO_MAX_W,
  ),
  closedSingle: clsx(
    "max-h-[calc(100dvh-4.5rem)] wide:max-h-[calc(100dvh-8rem)]",
    PHOTO_MAX_W,
  ),
};

/**
 * 面板的骨架与表面。
 *
 * 抽成常量是因为载入态与就绪态共用同一块面板 —— 尺寸必须一模一样，
 * 否则数据到达时面板会先跳一下再填内容。
 *
 * relative：紧凑布局下参数抽屉按 absolute 铺满这块面板，
 * 少了它抽屉会去找更外层的定位祖先。
 *
 * 宽高都固定、不随照片尺寸变：原先宽度由照片撑开，于是横幅一张宽、
 * 竖幅一张窄，翻页时整块面板跟着忽宽忽窄地跳。固定下来之后画面区尺寸恒定，
 * 竖图就在其中居中、两侧留空 —— 留白比跳动好。
 * max-w-full 兜住窄窗口，与照片尺寸上限里的 calc(100vw-26rem) 配套。
 */
const PANEL_SHELL = clsx(
  "relative flex h-full w-full flex-col overflow-hidden",
  "wide:h-[calc(100dvh-4rem)] wide:w-[1180px] wide:max-w-full wide:flex-row",
);

/**
 * 亮色靠投影浮起，暗色靠描边划界。
 *
 * 暗色下投影落在深底上本就看不见，而面板（0.185）与遮罩压过的地图
 * （0.145 再乘两成）虽有亮度差，一旦落到画面区那圈内边距上，
 * 面积太小就读不出边界，整块面板于是与背后连成一片。
 * 补一圈淡白描边，轮廓才立得住。
 *
 * 用 ring 而非 inset ring：面板的两个子区各有实底且铺满，
 * 内描边会被它们盖掉。
 */
const PANEL_SURFACE = clsx(
  "bg-lab-raised",
  "shadow-[0_8px_24px_-8px_rgba(0,0,0,0.14),0_32px_72px_-24px_rgba(0,0,0,0.22)]",
  "dark:shadow-none dark:ring-1 dark:ring-lab-on-media/15",
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
  "ring-1 ring-black/[0.07]",
  "shadow-[0_1px_2px_rgba(0,0,0,0.09),0_4px_10px_-3px_rgba(0,0,0,0.14)]",
  "dark:ring-0 dark:shadow-none",
);

interface TraceViewerProps {
  photos: PhotoItem[];
  /** 初始显示哪一张 */
  currentId?: number;
  isOpen: boolean;
  /** 照片详情仍在路上。此时面板已就位，内部显示取景动画 */
  isLoading?: boolean;
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
  isLoading = false,
  onClose,
  onSelect,
}: TraceViewerProps) {
  const initialIndex = useMemo(() => {
    const found = photos.findIndex((item) => item.id === currentId);
    return found < 0 ? 0 : found;
  }, [photos, currentId]);

  const [index, setIndex] = useState(initialIndex);

  /**
   * 参数抽屉的展开状态，只在紧凑布局下起作用（宽屏被 wide: 覆盖成常驻）。
   * 默认收起：手机上先把整块屏幕让给照片，要看参数再拉开。
   */
  const [isMetaOpen, setIsMetaOpen] = useState(false);

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

  const photoSize = isMetaOpen
    ? hasThumbs
      ? PHOTO_SIZE.openWithThumbs
      : PHOTO_SIZE.openSingle
    : hasThumbs
      ? PHOTO_SIZE.closedWithThumbs
      : PHOTO_SIZE.closedSingle;

  /**
   * 把手上的摘要：地点与日期。
   * 取自与参数栏同一个提取函数，措辞不会与拉开后看到的那份对不上。
   */
  const handleSummary = useMemo(() => {
    if (!photo) return "拍摄信息";
    const { place } = extractPhotoMeta(photo);
    return (
      [place, formatTakenDate(photo.takenAt)].filter(Boolean).join("  ·  ") ||
      "拍摄信息"
    );
  }, [photo]);

  const goTo = useCallback(
    (next: number) => {
      if (total === 0) return;
      // 环形翻页：到头接回另一端，省去禁用态
      const target = (next + total) % total;
      setIndex(target);
      onSelect?.(photos[target]);
    },
    [photos, total, onSelect],
  );

  /** 左右方向键翻页。Esc 由对话框自己处理 */
  useEffect(() => {
    if (!isOpen || total <= 1) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") goTo(index - 1);
      if (event.key === "ArrowRight") goTo(index + 1);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, total, index, goTo]);

  /**
   * 详情还没到（或压根没有）时，面板照样撑开、内部走取景动画。
   *
   * 点标记到照片出现之间有一次网络往返，若等数据到齐才开面板，
   * 那段时间屏幕上毫无动静，点击像是没生效。先把面板立起来，
   * 尺寸本就是固定的，数据补上时不会再跳一次。
   */
  if (!photo) {
    if (!isLoading) return null;

    return (
      <FullscreenDialog
        isOpen={isOpen}
        onClose={onClose}
        label="足迹照片查看器"
      >
        <div className="flex h-full w-full items-center justify-center wide:p-8">
          <div className={clsx(PANEL_SHELL, PANEL_SURFACE)}>
            <div className="flex flex-1 items-center justify-center bg-lab-sunken">
              <FocusLoader />
            </div>
          </div>
        </div>
      </FullscreenDialog>
    );
  }

  return (
    <FullscreenDialog isOpen={isOpen} onClose={onClose} label="足迹照片查看器">
      {/* 外层负责居中，并在宽屏留出四周的地图余白 */}
      <div className="flex h-full w-full items-center justify-center wide:p-8">
        <div className={clsx(PANEL_SHELL, PANEL_SURFACE)}>
          {/**
           * 画面区。
           *
           * 底色比面板沉一档，把照片托出来。
           *
           * 紧凑布局下画面区占满整个面板，只在底部留出 3rem 给抽屉把手 ——
           * 手机屏幕纵向本就紧张，与参数对半分的话两边都不够用：
           * 照片小得看不清，参数也仍要滚。改成默认只给照片，
           * 参数收进抽屉里按需拉开。
           */}
          <div
            className={clsx(
              "relative flex min-h-0 flex-1 flex-col",
              /**
               * 底部留白随抽屉走：收起时只避开 3rem 的把手，
               * 拉开后让出整个 58dvh，照片于是被"顶"到上半屏居中，
               * 而不是留在面板正中被抽屉压住下半截。
               * 与照片的 max-height 一同过渡，看着就是照片缩小上移。
               */
              "transition-[padding-bottom] duration-300 ease-out",
              isMetaOpen ? "pb-[58dvh]" : "pb-12",
              "wide:pb-0 wide:transition-none",
              /**
               * 两个主题都取 sunken，即"比面板沉一档"。
               * 暗色原先用 lab-ink（0.145），那正是地图的底色，画面区于是
               * 与背景同色；换成 sunken（0.115）既比参数栏（0.185）明显更沉，
               * 面板内部的层次也读得出来。
               */
              "bg-lab-sunken",
            )}
          >
            <div className="relative flex min-h-0 flex-1 items-center justify-center p-3 wide:p-6">
              <LivePhoto
                key={photo.id}
                photoInfo={photo}
                sizeClassName={clsx(
                  photoSize,
                  // 与画面区的留白同步过渡，合起来就是"照片缩小并上移"
                  "transition-[max-height] duration-300 ease-out",
                )}
                frameClassName={PHOTO_SURFACE}
              />

              {/**
               * 紧凑布局的关闭按钮。
               * 那里参数抽屉是收起的，里头那枚按钮跟着藏了起来，
               * 关闭这件事不能没有出口，只好压在画面一角。
               * 宽屏则交给参数栏里那枚（见下方），不占画面。
               */}
              <IconButton
                label="关闭"
                onClick={onClose}
                className="absolute right-1 top-1 z-20 h-11 w-11 wide:hidden"
              >
                <X className="h-[18px] w-[18px]" />
              </IconButton>

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
           *
           * 两种形态：宽屏是常驻的一列；紧凑布局下是贴底的抽屉，
           * 绝对定位铺满面板，收起时下移到只露出把手。
           * 收起用 translate 而非改 top/height —— 后两者无法过渡，
           * 位移走合成层，动画顺滑也不触发重排。
           */}
          <div
            className={clsx(
              // z-30 压过画面区那些 z-20 的控件：抽屉拉开时该把它们盖住，
              // 收起后两者位置不重叠，互不影响
              // 固定 58dvh 贴底，不铺满 —— 拉开后上方仍留 42dvh 给照片。
              // z-30 压过画面区那些 z-20 的控件：抽屉拉开时该把它们盖住，
              // 收起后两者位置不重叠，互不影响
              "absolute inset-x-0 bottom-0 z-30 flex h-[58dvh] flex-col",
              "transition-transform duration-300 ease-out",
              // 位移量写成完整字面量：Tailwind 靠静态扫描收类名，拼接的读不到
              isMetaOpen ? "translate-y-0" : "translate-y-[calc(100%-3rem)]",
              "border-t border-lab-line bg-lab-raised",
              "wide:static wide:z-auto wide:h-full wide:flex-none wide:translate-y-0",
              // 宽屏不是抽屉，去掉过渡免得布局切换时跟着滑一下
              "wide:transition-none",
              "wide:border-l wide:border-t-0",
              META_WIDTH,
            )}
          >
            {/**
             * 抽屉把手，只在紧凑布局出现。
             *
             * 收起时它是参数区唯一露出来的部分，故左侧顺带把地点与日期报出来 ——
             * 那是这张照片最要紧的两项，看一眼就够的人不必再拉开。
             */}
            <button
              type="button"
              onClick={() => setIsMetaOpen((prev) => !prev)}
              aria-expanded={isMetaOpen}
              className={clsx(
                "flex h-12 shrink-0 items-center justify-between gap-3 px-5 text-left",
                "border-b border-lab-line wide:hidden",
                "focus-visible:outline-1 focus-visible:-outline-offset-2 focus-visible:outline-lab-accent",
              )}
            >
              <span className="min-w-0 truncate text-[13px] text-lab-paper">
                {handleSummary}
              </span>
              <ChevronUp
                aria-hidden
                className={clsx(
                  "h-4 w-4 shrink-0 text-lab-muted transition-transform duration-300",
                  isMetaOpen && "rotate-180",
                )}
              />
            </button>

            {/**
             * 关闭按钮只在宽屏落在这里 —— 那时参数栏常驻，按钮跟着可见，
             * 又不必压在照片上。紧凑布局下抽屉会收起，
             * 关闭得另放一个常驻在画面区（见上方）。
             */}
            <IconButton
              label="关闭"
              onClick={onClose}
              className="absolute right-2 top-2 z-10 hidden h-9 w-9 wide:flex"
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
