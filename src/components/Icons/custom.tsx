'use client';
import Image from 'next/image';
import clsx from 'clsx';
import { LeftIcon } from './button';

/**
 * 站点标识。
 * 深浅两版靠 dark: 变体切换，不依赖 JS 读取主题：
 * 既避免了首帧渲染错版本再跳变，也修正了主题为「跟随系统」时取错图的问题。
 * alt 置空是因为相邻处已有文字品牌名，避免屏幕阅读器重复播报。
 */
export const Logo: React.FC<{ size?: number; className?: string }> = ({
  size = 32,
  className
}) => {
  return (
    <>
      <Image
        className={clsx(className, 'dark:hidden')}
        src="/logo_black.png"
        width={size}
        height={size}
        alt=""
      />
      <Image
        className={clsx(className, 'hidden dark:block')}
        src="/logo_white.png"
        width={size}
        height={size}
        alt=""
      />
    </>
  );
};

export const BackIcon: React.FC<{ className?: string }> = ({
  className = ''
}) => {
  return (
    <LeftIcon
      className={`${className}`}
      onClick={() => window.history.back()}
    />
  );
};

export const MarkerIcon: React.FC = () => {
  return (
    <div className="relative flex flex-col items-center group">
      {/* 连接处与底部光点 */}
      <div className="flex flex-col items-center -mt-1">
        {/* 呼吸灯效果的外圈 */}
        <div className="relative flex items-center justify-center">
          <div className="absolute w-4 h-4 bg-brand-primary rounded-full animate-ping opacity-75" />
          <div className="relative w-3 h-3 bg-main rounded-full border-3 border-brand-primary shadow-[0_0_12px_#fff]" />
        </div>
      </div>
    </div>
  );
};
