import type { CSSProperties } from 'react';

/**
 * 四周淡出遮罩。
 *
 * 用多个色标分段逼近缓动曲线：两点线性渐变的 alpha 变化在感知上会留下
 * 明显的带状边界，分段后过渡柔和得多。
 * 垂直方向过渡区拉得更长，水平方向保留较宽的完全显示区。
 *
 * 两个渐变需配合 mask-composite: intersect 取交集，直接用 edgeFadeStyle 即可。
 */
const MASK_VERTICAL = `linear-gradient(to bottom,
  transparent 0%,
  rgba(0, 0, 0, 0.1) 8%,
  rgba(0, 0, 0, 0.35) 18%,
  rgba(0, 0, 0, 0.7) 28%,
  rgba(0, 0, 0, 0.92) 36%,
  #000 42%,
  #000 58%,
  rgba(0, 0, 0, 0.92) 64%,
  rgba(0, 0, 0, 0.7) 72%,
  rgba(0, 0, 0, 0.35) 82%,
  rgba(0, 0, 0, 0.1) 92%,
  transparent 100%)`;

const MASK_HORIZONTAL = `linear-gradient(to right,
  transparent 0%,
  rgba(0, 0, 0, 0.3) 6%,
  rgba(0, 0, 0, 0.75) 12%,
  #000 18%,
  #000 82%,
  rgba(0, 0, 0, 0.75) 88%,
  rgba(0, 0, 0, 0.3) 94%,
  transparent 100%)`;

export const EDGE_FADE_MASK = `${MASK_VERTICAL}, ${MASK_HORIZONTAL}`;

/**
 * 装饰用：可直接展开到 style 上的完整声明，含 Safari 前缀。
 * 淡出区间很长，适合纯氛围的背景，不适合承载需要辨认的内容。
 */
export const edgeFadeStyle: CSSProperties = {
  maskImage: EDGE_FADE_MASK,
  WebkitMaskImage: EDGE_FADE_MASK,
  maskComposite: 'intersect',
  WebkitMaskComposite: 'source-in'
};

/** 尾部淡出的过渡宽度。约两个 mono 字符，够看出"后面还有"但不吃掉可读内容 */
const TRAILING_FADE = '16px';

const MASK_TRAILING = `linear-gradient(to right,
  #000 0,
  #000 calc(100% - ${TRAILING_FADE}),
  transparent 100%)`;

/**
 * 单行内容的右端淡出。
 *
 * 用于横向排布且可能溢出的读数行：比 text-overflow 的省略号更安静，
 * 也避免 flex 布局下无法使用 truncate 的问题。
 * 内容未溢出时淡出区落在空白上，因此可以常态挂载。
 */
export const trailingFadeStyle: CSSProperties = {
  maskImage: MASK_TRAILING,
  WebkitMaskImage: MASK_TRAILING
};
