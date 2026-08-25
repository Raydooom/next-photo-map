import { FocusLoader } from "@/components/ui";

/**
 * 路由切换时的载入界面。
 *
 * 放在根段，所有页面共用一份 —— 各自再写一个只会让同一件事有好几种说法。
 * Next 会把它当作该段的 Suspense fallback，导航一发生就立即显示，
 * 直到新页面的服务端组件就绪。
 *
 * 沿用与照片查看器同一个取景框动画：站内的"正在准备"只该有一种语汇，
 * 换个花样反而让人以为发生的是两件不同的事。文案改成 Loading ——
 * 这里等的是一整页内容，不是某一张照片的合焦。
 *
 * 高度取 70dvh 而非满屏：导航栏与页脚由 layout 保留在原处，
 * 这一段只填内容区。写死 100dvh 会把没有导航栏的页面撑出一条滚动条。
 */
export default function Loading() {
  return (
    <div className="flex min-h-[70dvh] items-center justify-center">
      <FocusLoader label="Loading" />
    </div>
  );
}
