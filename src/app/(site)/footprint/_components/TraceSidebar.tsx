'use client';

import { ReactNode, useState } from 'react';
import { ChevronUp } from 'lucide-react';
import clsx from 'clsx';

import { Eyebrow } from '@/components/ui';
import type { CityIndexItem } from '../page';
import {
  LAYER_GROUPS,
  LAYER_GROUP_ORDER,
  type LayerGroupKey,
  type LayerVisibility
} from './layerGroups';

/**
 * 抽屉把手的高度。
 * 与收起时的位移量 calc(100%-48px) 以及地图控件的避让距离 bottom-[68px]
 * 是同一个数，改动时三处要一起。
 */
const HANDLE_H = 48;

/** 一项统计读数：大号数字压着一行极小标签 */
function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="min-w-0">
      <p
        className={clsx(
          'text-[22px] leading-none tabular-nums tracking-[-0.02em]',
          'text-lab-paper',
          "[font-variation-settings:'wght'_640]"
        )}
      >
        {value}
      </p>
      <p className="mt-2 text-xs text-lab-muted">{label}</p>
    </div>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return <Eyebrow className="mb-2.5 block text-lab-faint">{children}</Eyebrow>;
}

interface CityRowProps {
  item: CityIndexItem;
  isActive: boolean;
  onSelect: () => void;
}

/** 城市索引行。选中态以左侧竖条标示，与右对齐的计数形成两端结构 */
function CityRow({ item, isActive, onSelect }: CityRowProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={isActive}
      className={clsx(
        'flex w-full cursor-pointer items-center justify-between gap-3 px-2',
        /**
         * 行高分两档：紧凑布局（手机、竖屏平板）留足 44px 的触摸目标，
         * 宽屏用鼠标，压到 32px。城市会越来越多，桌面上多挤进一行
         * 就少一次滚动。
         */
        'min-h-11 wide:min-h-8',
        // 不再逐行画分隔线：行本身已按基线成列，一行一条线只是多出来的墨，
        // 十几个城市叠起来会读成一张表格。区分靠悬停与选中态即可。
        'text-left transition-colors',
        'hover:bg-lab-paper/5',
        'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-lab-accent',
        isActive ? 'text-lab-accent' : 'text-lab-muted hover:text-lab-paper'
      )}
    >
      <span className="flex min-w-0 items-center gap-2.5">
        <span
          aria-hidden
          className={clsx(
            'h-3.5 w-[2px] shrink-0 transition-colors',
            isActive ? 'bg-lab-accent' : 'bg-transparent'
          )}
        />
        {/* 城市名含中文，不套 lab-mono 的大写与宽字距 */}
        <span className="truncate text-[13px] [font-variation-settings:'wght'_560]">
          {item.city}
        </span>
      </span>
      <span className="lab-mono shrink-0 tabular-nums opacity-70">
        {item.count}
      </span>
    </button>
  );
}

/**
 * 一项图层开关。
 *
 * 仍是原生 checkbox（键盘与读屏的行为白拿），但把它收进 sr-only，
 * 外观交给紧跟其后的方框自己画。不用系统外观是因为本站没有声明
 * color-scheme，暗色主题下系统按亮色渲染，未选中态会是个白底灰边的实块，
 * 与周围格格不入；也没有去加全局的 color-scheme，那会一并改掉全站
 * 所有原生控件，为一个开关牵动的面太大。
 *
 * 选中态画对勾而非填满整格：纯色块认不出是勾选框，只像一枚色标。
 * 框放到 16px 才容得下这一笔。
 */
function LayerToggle({
  label,
  checked,
  onChange
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="group flex min-h-11 cursor-pointer items-center gap-2.5 text-[13px] text-lab-muted transition-colors wide:min-h-8 hover:text-lab-paper">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="peer sr-only"
      />

      {/**
       * 视觉方框。
       *
       * 对勾的显隐由这一层的文字色控制，而不是给 svg 自己挂 peer-checked ——
       * peer-* 走的是兄弟选择器，svg 在框内部并非 input 的兄弟，挂上去不生效。
       * 让框继承状态、勾取 currentColor，一处状态两处受用。
       */}
      <span
        className={clsx(
          'flex h-4 w-4 shrink-0 items-center justify-center border transition-colors',
          'border-lab-line text-transparent group-hover:border-lab-muted',
          'peer-checked:border-lab-accent peer-checked:bg-lab-accent peer-checked:text-lab-accent-ink',
          'peer-focus-visible:outline-1 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-lab-accent'
        )}
      >
        <svg
          viewBox="0 0 12 12"
          aria-hidden
          className="h-2.5 w-2.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M2 6.3 L4.8 9 L10 3.2" />
        </svg>
      </span>

      {label}
    </label>
  );
}

interface TraceSidebarProps {
  stats: { points: number; cities: number; provinces: number };
  cityIndex: CityIndexItem[];
  /** 当前聚焦的城市，null 表示全览 */
  activeCity: string | null;
  onSelectCity: (city: string | null) => void;
  /** 底图内容的分组可见性 */
  layerVisibility: LayerVisibility;
  onToggleLayer: (key: LayerGroupKey, value: boolean) => void;
}

/**
 * 足迹侧栏：概览、城市索引与图层开关。
 *
 * 放在右侧而非左侧：地图是内容载体，视线从左上进入应先落在地图上，
 * 索引与筛选属于工具，退居右侧；首页的足迹面板也是浮在地图右侧，
 * 两处的空间关系保持一致。
 *
 * 这里的图层开关只调底图内容的疏密（地名、路网、街道标注）。
 * 点位与区县是两种互斥的读图方式，切换控件在地图上，不在这份工具栏里。
 */
export function TraceSidebar({
  stats,
  cityIndex,
  activeCity,
  onSelectCity,
  layerVisibility,
  onToggleLayer
}: TraceSidebarProps) {
  /**
   * 抽屉的展开状态，只在紧凑布局下起作用。
   * 宽屏侧栏是常驻的一列，这个值对它没有影响（样式里被 wide: 覆盖掉）。
   */
  const [isOpen, setIsOpen] = useState(false);

  return (
    <aside
      className={clsx(
        'flex flex-col overflow-hidden',
        /**
         * 两种形态。
         *
         * 宽屏：占住布局的一列，静态定位、满高。
         * 紧凑：贴底的抽屉，绝对定位铺满地图区，收起时整体下移到只露出把手。
         *
         * 收起用 translate 而不是改 top/height —— 那两者无法过渡，
         * 而位移走的是合成层，动画顺滑且不触发重排。
         * 位移量 100% 减去把手高度，正好把把手留在视口内。
         */
        'absolute inset-0 z-20 transition-transform duration-300 ease-out',
        // 位移量写成完整字面量，不与 HANDLE_H 拼接：
        // Tailwind 靠静态扫描源码收类名，模板字符串拼出来的它读不到
        isOpen ? 'translate-y-0' : 'translate-y-[calc(100%-48px)]',
        'wide:static wide:z-auto wide:h-full wide:w-[300px] wide:translate-y-0',
        /**
         * 底色取 raised 而非 ink：ink 是页面底色，两个主题下都与地图底色
         * 太近（亮色 0.975 对浅底图、暗色 0.145 对暗底图几乎同色），
         * 侧栏于是只靠一条线与地图分家，读不出是压在上面的一块面板。
         * raised 抬升一档，再配投影，层级才立得住。
         */
        'bg-lab-raised',
        /**
         * 分界线的方向随布局走：宽屏侧栏在地图右侧，界在左边；
         * 紧凑布局下它贴在底部，界该在上边。
         */
        'border-t border-lab-line wide:border-l wide:border-t-0',
        // 投影同理换向：向上托 / 向左托，暗色下投影近乎不可见，交由描边与底色差交代
        'shadow-[0_-2px_10px_rgba(0,0,0,0.05)]',
        'wide:shadow-[-2px_0_10px_rgba(0,0,0,0.05),-14px_0_32px_-14px_rgba(0,0,0,0.10)]'
      )}
    >
      {/**
       * 把手，只在紧凑布局出现。
       *
       * 收起时它是抽屉唯一露出来的部分，所以要自己交代抽屉里装着什么 ——
       * 只画一个箭头的话，观者不知道拉开会得到城市索引还是图层开关。
       * 故左侧摆一句摘要，右侧才是方向箭头。
       */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        className={clsx(
          'flex shrink-0 items-center justify-between gap-3 px-5',
          'border-b border-lab-line text-left wide:hidden',
          'focus-visible:outline-1 focus-visible:-outline-offset-2 focus-visible:outline-lab-accent'
        )}
        style={{ height: HANDLE_H }}
      >
        <span className="flex items-baseline gap-2.5">
          <Eyebrow className="text-lab-muted">Footprints</Eyebrow>
          <span className="lab-mono tabular-nums text-lab-faint">
            {stats.points} · {stats.cities}
          </span>
        </span>

        <ChevronUp
          aria-hidden
          className={clsx(
            'h-4 w-4 shrink-0 text-lab-muted transition-transform duration-300',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {/* 概览。紧凑布局下把手已经报过量级，这里的标题就不必再来一遍。
          shrink-0 免得空间紧张时它被压扁 —— 该让位的是城市列表，它自己会滚 */}
      <div className="shrink-0 border-b border-lab-line px-5 pb-4 pt-4 wide:pt-5">
        <Eyebrow className="hidden items-baseline gap-3 wide:flex">
          <span className="text-lab-muted">Footprints</span>
        </Eyebrow>

        {/* 三项概览：先给量级，再让人往下看明细 */}
        <div className="flex gap-x-10 wide:mt-4">
          <Stat value={stats.points} label="足迹" />
          <Stat value={stats.cities} label="城市" />
          <Stat value={stats.provinces} label="省份" />
        </div>
      </div>

      {/**
       * 城市区。
       *
       * 这一段是唯一的弹性区（flex-1），高度由剩余空间决定，超出即在内部滚动 ——
       * 城市只会越来越多，而下方的图层开关不该被它挤出视野。
       * min-h-0 是让 flex 子项能收缩到内容以下的前提，缺了它 overflow 不生效。
       *
       * 标题不随列表滚走：滚到一半时还得知道自己在看什么。
       */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="shrink-0 px-5 pt-4">
          <SectionLabel>Cities</SectionLabel>
        </div>

        {/**
         * 列表容器。
         *
         * 除了 flex-1，还压一道 max-height：只靠 flex-1 的话，高度是"剩余空间"
         * 的结果 —— 城市不多时它被撑满，永远达不到溢出条件，也就永远滚不动；
         * 城市多时又要与相邻两区抢空间。给出明确上限，超过即在内部滚，
         * 与其他区多高无关。
         * 宽屏侧栏是一整列，纵向宽裕，仍交给 flex-1 把图层区顶到底部。
         */}
        <div className="no-scrollbar min-h-0 max-h-[38dvh] flex-1 overflow-y-auto px-5 pb-4 wide:max-h-none">
          {/*
            「全部」与下面的城市不是同一层级，是这份列表的总计，
            单独留一条线隔开 —— 城市之间不画线，这一条才有分量。
          */}
          <div className="mb-1 border-b border-lab-line/50 pb-1">
            <CityRow
              item={{
                city: '全部',
                province: '',
                count: stats.points,
                center: [0, 0]
              }}
              isActive={!activeCity}
              onSelect={() => onSelectCity(null)}
            />
          </div>

          {cityIndex.map((item) => (
            <CityRow
              key={item.city}
              item={item}
              isActive={activeCity === item.city}
              onSelect={() => onSelectCity(item.city)}
            />
          ))}
        </div>
      </div>

      {/*
        图层区，只管底图内容的疏密，按由粗到细排列，与缩放层级的递进一致。
        点位与区县的切换不在这里 —— 那是两种互斥的读图方式，
        属于取景操作，控件放在地图上。
      */}
      <div className="shrink-0 border-t border-lab-line px-5 py-4">
        <SectionLabel>Layers</SectionLabel>

        {LAYER_GROUP_ORDER.map((key) => (
          <LayerToggle
            key={key}
            label={LAYER_GROUPS[key].label}
            checked={layerVisibility[key]}
            onChange={(value) => onToggleLayer(key, value)}
          />
        ))}
      </div>
    </aside>
  );
}
