"use client";

import clsx from "clsx";

export type FootprintView = "points" | "regions";

/**
 * 视图示意图。
 *
 * 画的是两种视图各自的样子而不是配一个图标 —— 「点位」与「区县」
 * 都是抽象词，图标（针 / 多边形）仍要人去翻译，而缩略图让人直接认出
 * 切过去会看到什么。这也是地图类应用切换底图时的通行做法。
 *
 * 图形用 currentColor，随选中态一同变化，不必另配一套颜色。
 */
function PointsThumb() {
  return (
    <svg
      viewBox="0 0 60 38"
      aria-hidden
      className="h-full w-full"
      fill="currentColor"
    >
      {/* 疏密不均、大小不等：照片落点本就是这样散着的 */}
      <circle cx="13" cy="11" r="3" />
      <circle cx="30" cy="19" r="4.5" />
      <circle cx="45" cy="9" r="2.5" />
      <circle cx="21" cy="29" r="2" />
      <circle cx="43" cy="27" r="3.5" />
    </svg>
  );
}

function RegionsThumb() {
  return (
    <svg viewBox="0 0 60 38" aria-hidden className="h-full w-full">
      {/*
        三块相邻的行政区。
        原先画四块、描边 1px 配 22% 填充，在 68px 宽的卡片里几条边线挤到一起
        糊成了一片实色块，反而比点位那张更重。减到三块、边线收细、填充压淡，
        让它保持"轮廓"的读法而不是"色块"。
      */}
      <g
        fill="currentColor"
        fillOpacity="0.14"
        stroke="currentColor"
        strokeWidth="0.9"
      >
        <path d="M8 8 L28 6 L31 20 L12 23 Z" />
        <path d="M28 6 L51 10 L46 22 L31 20 Z" />
        <path d="M12 23 L31 20 L45 22 L41 32 L16 31 Z" />
      </g>
    </svg>
  );
}

const VIEWS: {
  key: FootprintView;
  label: string;
  Thumb: () => React.ReactElement;
}[] = [
  { key: "points", label: "足迹", Thumb: PointsThumb },
  { key: "regions", label: "区域", Thumb: RegionsThumb },
];

interface ViewSwitchProps {
  value: FootprintView;
  onChange: (value: FootprintView) => void;
  className?: string;
}

/**
 * 足迹视图切换。
 *
 * 两种视图互斥：点位回答"具体在哪拍的"，区县回答"走遍了哪些地方"，
 * 各自是一套完整的读法，叠在一起时轮廓的色块会与点标记争夺同一片注意力。
 *
 * 放在地图左下而非侧栏：它切换的是地图本身呈现什么，属于取景操作，
 * 该待在被操作的对象旁边；缩放控件占着右下，两组控件分列两角互不遮挡。
 */
export function ViewSwitch({ value, onChange, className }: ViewSwitchProps) {
  return (
    <div
      role="group"
      aria-label="足迹视图"
      /**
       * 面板：磨砂玻璃浮在地图之上。
       *
       * 原先是 bg-lab-raised 配 border-lab-line，暗色下 0.185 的底
       * 压在 0.145 的地图上只差 0.04，描边 0.3 也淡，整个控件像贴在地图里
       * 的一块同色区域。
       *
       * 三处一起给层次：底色留一点透明并模糊背后的地图 —— 真实的景深比
       * 实色更能说明"这一层在上面"；描边换成 line-strong（暗色 0.48，
       * 对地图有 3 倍以上明度差）把边界咬住；再加一层投影托底。
       */
      className={clsx(
        "flex overflow-hidden",
        /**
         * 描边分主题：亮色留一道浅线，暗色才加重。
         * 投影只在浅底上读得出来，暗色地图（0.145）吃掉投影后就只剩描边
         * 能交代边界；反过来在亮色地图上，line-strong（0.58）配着投影
         * 会成为一道深灰硬边，比控件本身还抢眼。
         */
        "border border-lab-line dark:border-lab-line-strong",
        "bg-lab-raised/88 backdrop-blur-md",
        "shadow-[0_2px_6px_rgba(0,0,0,0.16),0_14px_30px_-10px_rgba(0,0,0,0.28)]",
        className,
      )}
    >
      {VIEWS.map(({ key, label, Thumb }, index) => {
        const isActive = value === key;

        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            aria-pressed={isActive}
            className={clsx(
              "group flex w-[68px] cursor-pointer flex-col",
              "transition-colors",
              // 两格之间只共用一条线，不各画一条
              index > 0 &&
                "border-l border-lab-line dark:border-lab-line-strong",
              "focus-visible:outline-1 focus-visible:-outline-offset-1 focus-visible:outline-lab-accent",
              isActive ? "text-lab-accent" : "text-lab-muted",
            )}
          >
            {/*
              示意区：比卡片底稍沉一档，像一小片地图。

              未选中整体压到 45% 不透明度，而不是只把颜色调淡 ——
              两张示意图的墨量本就不等（散点 vs 轮廓），单靠调色总会有一张
              压过当前选中的那张；整卡降透明度是结构性的，
              无论图形怎么改，未选中一定弱于选中。
            */}
            <span
              className={clsx(
                "flex h-[38px] items-center justify-center px-2 py-1",
                // 半透明的暗底而非实色 sunken：让磨砂透上来，这一格才是"凹进面板"
                "bg-lab-ink/45 transition-opacity",
                isActive ? "opacity-100" : "opacity-45 group-hover:opacity-75",
              )}
            >
              <Thumb />
            </span>

            {/**
             * 标签带：选中即铺强调色实底。
             *
             * 早前只用蓝字加 8% 淡底，怕实底成为整屏最跳的一处；
             * 但压在地图上的控件本就该跳，8% 的蓝落在磨砂面板上几乎读不出来，
             * 当前选中哪一项要盯着看才知道。实底配白字才是一眼可辨，
             * 用的也是聚合点那支 accent-solid —— 同一页里"当前选中"
             * 与"数量读数"共用一支色，读者只需认一种蓝。
             */}
            <span
              className={clsx(
                "lab-mono border-t px-2 py-1.5 text-center transition-colors",
                isActive
                  ? "border-lab-accent-solid bg-lab-accent-solid text-lab-on-media"
                  : "border-lab-line dark:border-lab-line-strong",
              )}
            >
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
