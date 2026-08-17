import clsx from 'clsx';
import { LivePhotoIcon } from '../Icons/icon';

/**
 * 实况照片标记。
 * 沿用 iOS 照片的视觉：胶囊形、半透明深色底叠毛玻璃、白色图标与文字。
 * 这是浮在照片之上的功能徽章，不属于页面结构，因此不套用整站的直角语言。
 * 左内边距略小于右侧，用于补偿圆形图标的视觉留白。
 */
export default function LivePhotoIndicate({
  isPlaying = false
}: {
  isPlaying?: boolean;
}) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-full',
        'bg-black/45 py-1.5 pl-2 pr-2.5 backdrop-blur-md',
        // 图标取 currentColor，故在容器上统一设为白色
        'text-white'
      )}
    >
      <LivePhotoIcon
        className={clsx('shrink-0', isPlaying && 'animate-spin-2s')}
        size={15}
      />
      {/* 中文不套 lab-mono 的大写转换与宽字距 */}
      <span className="text-[11px] font-medium leading-none">实况</span>
    </span>
  );
}
