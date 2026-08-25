"use client";

import { useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import maplibreGl from "maplibre-gl";
import { motion, useReducedMotion } from "motion/react";
import Image from "next/image";
import clsx from "clsx";

/**
 * 照片标记的直径（像素）。
 * 与聚合点的中间档位相当 —— 两者同形同量，密集时才不会一大一小地跳。
 * 角标与视角锥的尺寸都是按这个直径配的，改动时需一并调。
 */
const FRAME_SIZE = 42;

/**
 * 相纸的纸色，固定浅色、不随主题翻转。
 *
 * 早前取 lab-raised，暗色下它是 0.185，与地图底色 0.145 几乎同色，
 * 白边成了深灰边，"相纸"的层次直接消失。相纸本来就是白的 ——
 * 这类"压在媒体之上、明暗与主题无关"的场景正是 on-media 系令牌的用途。
 * 压到 92% 是为了在暗场里不至于刺眼。
 */
const PAPER_BG = "bg-lab-on-media/92";

/**
 * 聚合标记的分档：内盘直径与数字字号一同放大。
 *
 * 不做连续插值：档位少而明确，扫一眼就能比出"这片比那片多"，
 * 连续尺寸在数量接近时反而分辨不出差别。
 * 字号也随档位走 —— 固定 11px 的 mono 放在 50px 的盘里太小，
 * 数字是这个标记的主角，得撑得起来。
 */
const CLUSTER_STEPS: { min: number; size: number; fontSize: number }[] = [
  { min: 30, size: 54, fontSize: 17 },
  { min: 10, size: 48, fontSize: 16 },
  { min: 4, size: 42, fontSize: 15 },
  { min: 0, size: 36, fontSize: 13 },
];

/** 进场延迟的散布区间（秒），标记在这个窗口内先后冒出 */
const MAX_RANDOM_DELAY = 0.45;

/**
 * 由标记的稳定标识散出一个 0~1 的值，用来错开进场时间。
 *
 * 不用 Math.random()：标记会随地图平移缩放频繁重挂，每次重算延迟会让
 * 同一个标记的出现时机忽早忽late，观感是闪烁而非陆续冒出。
 * 也不按数组序号：那个顺序来自 queryRenderedFeatures，会随视野变化重排，
 * 而且线性递增看着仍是齐整的一列，不像随机。
 * 拿 renderKey 做哈希则两头都稳：同一个标记恒定，不同标记散开。
 */
const hashToUnit = (key: string) => {
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) | 0;
  }
  return (Math.abs(hash) % 1000) / 1000;
};

const resolveClusterStep = (count: number) =>
  CLUSTER_STEPS.find((step) => count >= step.min) ??
  CLUSTER_STEPS[CLUSTER_STEPS.length - 1];

interface ClusterMarkerProps {
  map: maplibreGl.Map;
  cluster: any;
  onClick: (cluster: any) => void;
  /**
   * 在当前一批标记中的序号，仅在 renderKey 缺失时兜底充当哈希种子。
   * 标记各自 portal 到独立的 maplibre 容器里，彼此不在同一个 DOM 父级下，
   * 无法靠 staggerChildren 传播，进场延迟只能各自算。
   */
  index?: number;
}

/**
 * 地图点位标记。
 *
 * 分两种形态，对应两种语义：
 *
 * 具体地点（未被聚合）用照片本身 —— 一张贴在地图上的小相纸：直角、白边、
 * 落影，多张时背后错开叠出纸堆的厚度，右上角挂数量角标。影像地图的标记
 * 显示内容本身远胜过显示一个数字，"那里拍了这张"是一眼就成立的信息。
 *
 * 聚合点（多个地点挤在一起）则保持抽象：强调色圆盘配数字。它代表的是
 * 一片区域而非某一处，拿其中任意一张照片代言并不诚实；圆形也延续了
 * 首页城市标记的观感。数字一律是照片数，由数据源的 clusterProperties
 * 累加得出，而非 point_count 的地点数。
 */
export const ClusterMarker = ({
  map,
  cluster,
  onClick,
  index = 0,
}: ClusterMarkerProps) => {
  const container = useMemo(() => document.createElement("div"), []);
  const markerRef = useRef<maplibreGl.Marker | null>(null);
  const shouldReduce = useReducedMotion();

  useEffect(() => {
    // 由 MapLibre 内部的 requestAnimationFrame 驱动位置更新，极其丝滑
    const marker = new maplibreGl.Marker({
      element: container,
      anchor: "center",
    })
      .setLngLat(cluster.coordinates)
      .addTo(map);

    markerRef.current = marker;

    return () => {
      marker.remove();
      markerRef.current = null;
    };
  }, [map, container]); // 仅在初始化和销毁时执行

  // 响应位置变化
  useEffect(() => {
    markerRef.current?.setLngLat(cluster.coordinates);
  }, [cluster.coordinates]);

  const isCluster = Boolean(cluster.properties?.cluster);
  const data = useMemo(
    () => JSON.parse(cluster.properties?.data || "{}"),
    [cluster.properties?.data],
  );

  const count = isCluster
    ? Number(cluster.properties?.photoCount ?? cluster.properties?.point_count)
    : (data?.list?.length ?? 1);

  const thumbUrl: string | undefined = isCluster
    ? undefined
    : data?.list?.[0]?.photo?.thumbSmallUrl;

  // 单张照片且记录了拍摄朝向时，在相纸外侧点一个方向标
  const bearing = useMemo(() => {
    if (isCluster || data?.list?.length !== 1) return null;
    const value = data.list[0]?.bearing;
    return value === null || value === undefined
      ? null
      : parseInt(String(value), 10);
  }, [isCluster, data]);

  /**
   * 进场动效：一个个先后冒出来。
   *
   * 延迟由 renderKey 散出，同一批标记因此在 0~0.45s 内错落出现，
   * 而不是齐刷刷一起显形。
   *
   * 尺寸从 0.5 长到 1 并带一点回弹，是"冒出来"的动作来源；bounce 压到
   * 0.3 左右，有生长感但不至于弹跳。透明度另走一条更快的补间 ——
   * 若跟着弹簧走，回弹阶段的透明度会来回浮动，看着发虚。
   */
  const delay = shouldReduce
    ? 0
    : hashToUnit(String(cluster.renderKey ?? index)) * MAX_RANDOM_DELAY;

  const enter = shouldReduce
    ? {
        initial: { opacity: 1 },
        animate: { opacity: 1 },
        transition: { duration: 0 },
      }
    : {
        initial: { opacity: 0, scale: 0.5 },
        animate: { opacity: 1, scale: 1 },
        transition: {
          default: {
            type: "spring" as const,
            duration: 0.55,
            bounce: 0.3,
            delay,
          },
          opacity: { duration: 0.22, ease: "easeOut" as const, delay },
        },
      };

  /**
   * 悬停反馈：原地放大，两种标记共用。
   *
   * 不换色 —— 聚合点已是"深底 + 白描边"，再改色只能往更亮走，会盖过照片。
   * 不上浮 —— 标记锚定在自己的坐标上，位移等于暂时离开那个点位；
   * 放大是原地的，尺寸变了而中心不动，语义上才站得住。
   *
   * 交给 CSS 而非 motion 的 whileHover，是因为那条路走不通：
   * 进场的随机 delay 挂在组件级 transition 上，whileHover 可以内联一份
   * transition 把它盖掉，但指针移开时元素是"回到 animate 状态"，
   * 用的仍是组件级那份 —— 于是缩回去要先等该标记的进场延迟，
   * 一进一出两套时序，怎么调都对不齐。
   *
   * 分工反而干净：motion 只管一次性进场，CSS 管持续交互。
   * 两者作用在不同的 DOM 层（外层负责进场、内层负责悬停），
   * transform 各自独立地叠加，delay 没有泄漏的路径，
   * 进出也天然对称 —— CSS transition 本就是双向的同一条曲线。
   */
  const interactive = shouldReduce
    ? ""
    : clsx(
        "transition-transform duration-150 ease-out",
        "group-hover:scale-110 group-active:scale-[1.03]",
      );

  if (isCluster || !thumbUrl) {
    const { size, fontSize } = resolveClusterStep(count);

    return createPortal(
      <motion.button
        type="button"
        onClick={() => onClick?.(cluster)}
        aria-label={`${count} 个足迹`}
        className="group cursor-pointer rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lab-accent"
        style={{ width: size, height: size }}
        {...enter}
      >
        {/**
         * 盘面。样式挂在内层而非按钮本身，为的是让悬停缩放能作用到盘上 ——
         * 按钮的 transform 归 motion 管（进场），内层的归 CSS 管（悬停）。
         *
         * 配色：强调色实底 + 白字，两个主题同一套值。
         * 几轮试错筛掉的方案，记下缘由免得再走一遍：
         * · 跟随主题的 raised/sunken —— 暗色下 0.185 与地图底 0.145 同色，
         *   盘面整个沉进地图；
         * · 纯白盘配蓝字 —— 白盘成了整屏最亮的物件，还与白环照片撞成
         *   两个抢眼的圆，而照片才该是主角；
         * · 固定深底配白描边 —— 亮色地图是 0.975，白描边在上面等于没有，
         *   剩一个突兀的黑点。
         *
         * 症结在于"盘面明度"想同时对付一亮一暗两种底色。改用色相解决：
         * 蓝在灰绿色系的地图上本就跳，明度取中间的 0.5，与两种地图底色
         * 都拉开足够差距，白字对比约 5.5:1。蓝盘白字也与白环照片区分得开 ——
         * 一个是彩色读数，一个是照片本身。
         *
         * 描边用 inset ring：既是分离盘与地图的一道浅色内圈，
         * 又不像 border 那样把内容盒挤小。
         */}
        <span
          className={clsx(
            "flex h-full w-full items-center justify-center rounded-full",
            "bg-lab-accent-solid ring-1 ring-inset ring-lab-on-media/30",
            "shadow-[0_1px_2px_rgba(0,0,0,0.16),0_6px_14px_-4px_rgba(0,0,0,0.28)]",
            interactive,
          )}
        >
          <span
            className={clsx(
              // 白字压实底，两个主题下都是同一份高对比读数
              "font-mono tabular-nums leading-none text-lab-on-media",
              "[font-variation-settings:'wght'_680]",
            )}
            style={{ fontSize }}
          >
            {count}
          </span>
        </span>
      </motion.button>,
      container,
    );
  }

  return createPortal(
    <motion.button
      type="button"
      onClick={() => onClick?.(cluster)}
      aria-label={count > 1 ? `${count} 张照片` : "1 张照片"}
      className="group relative cursor-pointer"
      style={{ width: FRAME_SIZE, height: FRAME_SIZE }}
      {...enter}
    >
      {/**
       * 悬停缩放层，包住这枚标记的全部零件。
       *
       * 必须整体缩放：堆叠层、角标与视角锥都是按本体的尺寸摆位的，
       * 只放大其中一件，几者的相对关系就散了。
       */}
      <span className={clsx("absolute inset-0 block", interactive)}>
        {/**
         * 堆叠层：多张时背后错开两层，露出月牙形边缘暗示厚度。
         *
         * 用位移而非旋转 —— 方形相纸靠 rotate 露出边角，圆形转多少度都与
         * 自己重合，看不出叠了几层。往右下递进偏移，边缘便露出两道弧。
         */}
        {count > 1 && (
          <>
            <span
              aria-hidden
              className={clsx(
                "absolute inset-0 translate-x-[5px] translate-y-[4px] rounded-full",
                PAPER_BG,
                "shadow-[0_1px_3px_rgba(0,0,0,0.2)]",
              )}
            />
            <span
              aria-hidden
              className={clsx(
                "absolute inset-0 translate-x-[2.5px] translate-y-[2px] rounded-full",
                PAPER_BG,
                "shadow-[0_1px_3px_rgba(0,0,0,0.2)]",
              )}
            />
          </>
        )}

        {/* 本体：纸色圆环裱住照片。圆形与聚合点同形，语义靠有图/无图区分 */}
        <span
          className={clsx(
            "absolute inset-0 block overflow-hidden rounded-full p-[2px]",
            PAPER_BG,
            "shadow-[0_1px_2px_rgba(0,0,0,0.18),0_6px_14px_-4px_rgba(0,0,0,0.3)]",
          )}
        >
          {/* 圆环内也要裁圆，否则方形图片的四角会盖住环 */}
          <span className="relative block h-full w-full overflow-hidden rounded-full">
            <Image
              src={thumbUrl}
              alt=""
              fill
              sizes={`${FRAME_SIZE}px`}
              className="object-cover"
            />
          </span>
        </span>

        {/**
         * 数量角标：压在圆的右上，跨出一点边缘。
         *
         * 位置比方形时往里收 —— 方形的角在 (52,0)，圆的边在 45° 方向只到
         * (44,8)，沿用原先的 -right-2 -top-2 会让角标浮在圆外的空处，
         * 与圆脱开。
         *
         * 底色取固定深色而非强调色：强调色在暗色主题下是亮蓝，配白字
         * 对比度只有 2.5:1 左右，11px 的数字撑不住；深底白字两个主题都稳。
         * 描边跟着纸色走 —— 角标是从纸上"长"出来的，
         * 用页面底色会在暗色下与地图糊成一片。
         *
         * 底色令牌从 viewer-ink 换成 ink-on-media：前者只在暗色主题下定义，
         * 亮色下 var() 取不到值、整条 background-color 被丢弃，
         * 角标于是只剩白字浮在浅色地图上。
         */}
        {count > 1 && (
          <span
            className={clsx(
              "absolute -right-0.5 -top-0.5 z-10 flex h-[18px] min-w-[18px] items-center justify-center px-1",
              // 角标也收圆：方角压在圆上会读成另贴的一块，圆角才是同一个物件
              "rounded-full bg-lab-ink-on-media ring-[1.5px] ring-lab-on-media/92",
              "font-mono text-[11px] leading-none tabular-nums text-lab-on-media",
              "[font-variation-settings:'wght'_620]",
            )}
          >
            {count}
          </span>
        )}

        {/**
         * 拍摄朝向。
         *
         * 外层容器铺满整圆并整体旋转，标记便绕圆心转 —— 圆形到边缘的距离
         * 处处相等，转到任何角度与圆边的间隙都一样；方形时这根标在 45°
         * 附近会离角落忽远忽近，那是它此前看着别扭的原因。
         *
         * 形状取收窄的视角锥而非一根线："拍摄角度"说的是朝哪个方向取景，
         * 锥形自带从镜头张开的意味，细线读起来更像刻度。
         * 锥身填强调色、外描一圈纸色，压在深底图或浅照片上都还认得出。
         *
         * 只有单张照片才会走到这里（多张时朝向不一，取哪张都不对），
         * 因此不会与右上角的数量角标相撞。
         */}
        {bearing !== null && (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{ transform: `rotate(${bearing}deg)` }}
          >
            <svg
              width="12"
              height="8"
              viewBox="0 0 12 8"
              className="absolute -top-[9px] left-1/2 -translate-x-1/2 fill-lab-accent stroke-lab-on-media/92"
              strokeWidth="1.2"
              strokeLinejoin="round"
            >
              {/* 尖端朝上（0° 即正北），底边压向圆心一侧 */}
              <path d="M6 0.8 L10.9 7.2 L1.1 7.2 Z" />
            </svg>
          </span>
        )}
      </span>
    </motion.button>,
    container,
  );
};
