"use client";

import { useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import maplibreGl from "maplibre-gl";
import { motion, useReducedMotion } from "motion/react";
import Image from "next/image";
import clsx from "clsx";

/**
 * 照片标记的直径（像素）。与聚合点的中间档位相当，密集时才不会一大一小地跳。
 * 角标与视角锥的尺寸都按这个直径配，改动时需一并调。
 */
const FRAME_SIZE = 42;

/**
 * 相纸的纸色，固定浅色、不随主题翻转。
 *
 * 不能用 lab-raised：暗色下它是 0.185，与地图底色 0.145 几乎同色，
 * 白边会成深灰边。这类"压在媒体之上、明暗与主题无关"的场景用 on-media 系令牌。
 * 压到 92% 是为了在暗场里不刺眼。
 */
const PAPER_BG = "bg-lab-on-media/92";

/**
 * 聚合标记的分档：内盘直径与数字字号一同放大。
 * 不做连续插值 —— 数量接近时连续尺寸反而分辨不出差别。
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
 * 不用 Math.random()：标记随地图平移缩放频繁重挂，每次重算会让同一个标记
 * 的出现时机忽早忽晚，观感是闪烁而非陆续冒出。
 * 也不按数组序号：那个顺序来自 queryRenderedFeatures，会随视野重排，
 * 且线性递增看着仍是齐整一列。哈希 renderKey 两头都稳。
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
   * 标记各自 portal 到独立的 maplibre 容器，不在同一 DOM 父级下，
   * 无法靠 staggerChildren 传播，进场延迟只能各自算。
   */
  index?: number;
}

/**
 * 地图点位标记。分两种形态：
 *
 * 具体地点（未被聚合）用照片本身 —— 圆形相纸、纸色边、落影，多张时背后
 * 错开叠出厚度，右上角挂数量角标。
 * 聚合点代表一片区域而非某一处，故保持抽象：强调色圆盘配数字。
 * 数字一律是照片数，由数据源的 clusterProperties 累加得出，而非 point_count 的地点数。
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
   * 进场动效：延迟由 renderKey 散出，同批标记在 0~0.45s 内错落出现。
   *
   * 尺寸 0.5→1 带一点回弹是"冒出来"的动作来源，bounce 压到 0.3。
   * 透明度另走一条更快的补间 —— 跟着弹簧走的话回弹阶段透明度会来回浮动，发虚。
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
   * 悬停反馈：原地放大。不上浮 —— 标记锚定在自己的坐标上，位移等于暂时离开点位。
   *
   * 用 CSS 而非 motion 的 whileHover，因为那条路走不通：进场的随机 delay 挂在
   * 组件级 transition 上，whileHover 能内联一份盖掉它，但指针移开时元素是
   * "回到 animate 状态"、用的仍是组件级那份 —— 缩回去要先等进场延迟，
   * 一进一出两套时序对不齐。
   *
   * 分开之后 motion 只管一次性进场、CSS 管持续交互，作用在不同 DOM 层，
   * transform 各自叠加，delay 没有泄漏路径，进出也天然对称。
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
         * 盘面。样式挂内层而非按钮本身，好让悬停缩放作用到盘上 ——
         * 按钮的 transform 归 motion（进场），内层归 CSS（悬停）。
         *
         * 配色是强调色实底 + 白字，两个主题同一套值。筛掉过的方案：
         * 跟随主题的 raised/sunken（暗色下与地图底同色）、纯白盘配蓝字
         * （成了整屏最亮的物件，还与白环照片撞成两个圆）、固定深底配白描边
         * （亮色地图 0.975 上白描边等于没有）。
         *
         * 症结是"盘面明度"要同时对付一亮一暗两种底色，故改用色相解决：
         * 蓝在灰绿色系地图上本就跳，明度取中间的 0.5 与两种底色都拉开差距，
         * 白字对比约 5.5:1。
         *
         * 描边用 inset ring：是分离盘与地图的浅色内圈，又不像 border 挤小内容盒。
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
       * 悬停缩放层，包住全部零件。必须整体缩放：堆叠层、角标与视角锥
       * 都按本体尺寸摆位，只放大其中一件相对关系就散了。
       */}
      <span className={clsx("absolute inset-0 block", interactive)}>
        {/**
         * 堆叠层：多张时背后错开两层，露出月牙形边缘暗示厚度。
         * 用位移而非旋转 —— 圆形转多少度都与自己重合，看不出叠了几层。
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

        {/* 本体：纸色圆环裱住照片。与聚合点同形，语义靠有图/无图区分 */}
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
         * 位置比方形时往里收 —— 圆的边在 45° 方向只到 (44,8)，
         * 沿用 -right-2 -top-2 会让角标浮在圆外的空处。
         *
         * 底色取固定深色而非强调色：后者在暗色主题下是亮蓝，配白字对比只有
         * 2.5:1，11px 数字撑不住。令牌用 ink-on-media 而非 viewer-ink ——
         * 后者只在暗色主题下定义，亮色下 var() 取不到值、整条声明被丢弃，
         * 角标会只剩白字浮在浅色地图上。
         */}
        {count > 1 && (
          <span
            className={clsx(
              "absolute -right-0.5 -top-0.5 z-10 flex h-[18px] min-w-[18px] items-center justify-center px-1",
              // 角标也收圆：方角压在圆上会读成另贴的一块
              "rounded-full bg-lab-ink-on-media ring-[1.5px] ring-lab-on-media/92",
              "font-mono text-[11px] leading-none tabular-nums text-lab-on-media",
              "[font-variation-settings:'wght'_620]",
            )}
          >
            {count}
          </span>
        )}

        {/**
         * 拍摄朝向。外层铺满整圆并整体旋转，标记便绕圆心转 —— 圆到边缘处处
         * 等距，转到任何角度间隙都一样（方形时这根标在 45° 附近会忽远忽近）。
         *
         * 形状取收窄的视角锥而非一根线，自带从镜头张开的意味。
         * 锥身填强调色、外描一圈纸色，压在深底图或浅照片上都认得出。
         *
         * 只有单张照片会走到这里（多张时朝向不一），故不会与数量角标相撞。
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
