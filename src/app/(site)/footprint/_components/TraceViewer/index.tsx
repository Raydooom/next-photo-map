"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, ChevronUp, X } from "lucide-react";
import clsx from "clsx";

import { PhotoItem } from "@/lib/types";
import { formatTakenDate } from "@/lib/format";
import { extractPhotoMeta } from "@/lib/photoMeta";
import { FocusLoader, FullscreenDialog } from "@/components/ui";
import { IconButton } from "@/components/photo/PhotoLightbox/IconButton";
import { LivePhoto } from "@/components/photo/LivePhoto";
import { PhotoMetaHeader } from '@/components/photo/PhotoMetaSections';
import { MetaColumn } from "./MetaColumn";
import { Thumbs } from "./Thumbs";

/** 参数栏宽度（宽屏），与下面尺寸算式里的 21rem 对应 */
const META_WIDTH = "wide:w-[336px]";

/**
 * 照片的尺寸上限。
 *
 * 必须用视口单位而非百分比：LivePhoto 的画面框由图片撑开、高度是 auto，
 * 百分比上限无从解析会被忽略，大图就溢出被裁。也因此每档都写成完整字面量
 * —— Tailwind 靠静态扫描收类名，拼接的读不到。
 *
 * 扣减来源：
 *   宽屏  外层 p-8 4rem ／ 画面区 p-6 3rem ／ 缩略图条 4.75rem
 *         ／ 1rem 给投影（LivePhoto 根元素 overflow-hidden，顶满会裁成硬边）
 *   紧凑  收起时只让 3rem 给把手；拉开后画面区只剩 42dvh（100dvh 减抽屉 58dvh），
 *         照片须跟着缩，否则下半截被抽屉压住 ／ p-3 1.5rem ／ 缩略图条 4rem
 * 横向：宽屏让出参数栏 21rem 与两侧留白，紧凑只让 p-3。
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
 * 抽成常量是因为载入态与就绪态共用同一块面板，尺寸必须一致，
 * 否则数据到达时面板会先跳一下再填内容。
 *
 * relative：紧凑布局下参数抽屉按 absolute 铺满这块面板。
 * 宽高固定、不随照片变，否则横幅一张宽、竖幅一张窄，翻页时面板忽宽忽窄。
 * max-w-full 兜住窄窗口，与 calc(100vw-26rem) 配套。
 */
const PANEL_SHELL = clsx(
  "relative flex h-full w-full flex-col overflow-hidden",
  "wide:h-[calc(100dvh-4rem)] wide:w-[1180px] wide:max-w-full wide:flex-row",
);

/**
 * 亮色靠投影浮起，暗色靠描边划界。
 *
 * 暗色下投影落在深底上看不见，而面板与遮罩压过的地图虽有亮度差，
 * 落到画面区那圈内边距上面积太小读不出边界，面板会与背后连成一片。
 *
 * 用 ring 而非 inset ring：面板的两个子区各有实底且铺满，内描边会被盖掉。
 */
const PANEL_SURFACE = clsx(
  "bg-lab-raised",
  "shadow-[0_8px_24px_-8px_rgba(0,0,0,0.14),0_32px_72px_-24px_rgba(0,0,0,0.22)]",
  "dark:shadow-none dark:ring-1 dark:ring-lab-on-media/15",
);

/**
 * 照片自身的边界。
 *
 * 亮色下浅色照片（雪地、天空）的边缘会融进浅灰台面，故补描边与贴边投影。
 * 投影扩散压在 10px 内，PHOTO_SIZE 让出的 1rem 才接得住。
 * 暗色不用：照片自带亮度优势，加投影只会糊出一团脏影。
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
 * 与照片墙那套刻意分开：照片墙是浏览流，做成沉浸式全屏、参数按需展开；
 * 这里是从地图点位点进来的查阅，参数与照片同等重要，故常驻不藏。
 * 宽屏不铺满视口，四周露出一圈地图，示意没有离开那张图。
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

  /** 参数抽屉，只在紧凑布局起作用（宽屏被 wide: 覆盖成常驻）。默认收起让位给照片 */
  const [isMetaOpen, setIsMetaOpen] = useState(false);

  /**
   * 每次打开都回到入口那一张。只认 isOpen 的变化 —— 打开期间 index 由翻页推进，
   * 若跟着 initialIndex 走，外部同步 photoId 时会与翻页互相打断。
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

  /** 把手上的摘要。与参数栏取自同一个提取函数，措辞不会对不上 */
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
   * 详情未到时面板照样撑开、内部走取景动画。
   * 点标记到照片出现之间有一次网络往返，等数据到齐才开面板会让点击像没生效。
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
           * 画面区。紧凑布局下占满面板，只在底部留 3rem 给把手 ——
           * 手机上与参数对半分的话照片看不清、参数也仍要滚。
           */}
          <div
            className={clsx(
              "relative flex min-h-0 flex-1 flex-col",
              /**
               * 底部留白随抽屉走：收起时避开 3rem 把手，拉开后让出整个 58dvh，
               * 照片被顶到上半屏居中而不是留在正中被压住下半截。
               * 与照片的 max-height 一同过渡，看着就是照片缩小上移。
               */
              "transition-[padding-bottom] duration-300 ease-out",
              isMetaOpen ? "pb-[58dvh]" : "pb-12",
              "wide:pb-0 wide:transition-none",
              // sunken 比面板沉一档。暗色不能用 lab-ink，那是地图底色，会同色
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

              {/* 紧凑布局的关闭出口：抽屉收起时里头那枚按钮跟着藏了。宽屏交给参数栏那枚 */}
              <IconButton
                label="关闭"
                onClick={onClose}
                className="absolute right-1 top-1 z-20 h-11 w-11 wide:hidden"
              >
                <X className="h-[18px] w-[18px]" />
              </IconButton>

              {/* z-20 是为了盖过 LivePhoto 播放实况时铺开的那层 z-10 视频 */}
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
           * 参数栏。宽屏靠右竖排；紧凑布局退到照片下方占 42dvh、内部自行滚动。
           * 收起用 translate 而非改 top/height —— 后两者无法过渡，
           * 位移走合成层，动画顺滑也不触发重排。
           */}
          <div
            className={clsx(
              // z-30 压过画面区那些 z-20 控件：拉开时盖住，收起后位置不重叠
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
            {/* 抽屉把手。收起时它是唯一露出的部分，故顺带报出地点与日期 */}
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

            <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain">
              {/* 文件名、主题和日期固定在顶部，滚动长信息时仍能确认当前照片。 */}
              <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-lab-line bg-lab-raised px-5 pb-4 pt-5">
                <PhotoMetaHeader photo={photo} className="pr-2" />
                <IconButton
                  label="关闭"
                  onClick={onClose}
                  className="-mr-2 -mt-2 h-11 w-11 wide:h-9 wide:w-9"
                >
                  <X className="h-[18px] w-[18px] wide:h-4 wide:w-4" />
                </IconButton>
              </div>

              <div className="px-5 pb-5 pt-5">
                <MetaColumn photo={photo} showDate={false} showTheme={false} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </FullscreenDialog>
  );
}
