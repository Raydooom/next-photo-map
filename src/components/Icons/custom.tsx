'use client';
import Image from 'next/image';
import { useTheme } from 'next-themes';
import { useIsSSR } from '@react-aria/ssr';
import { LeftIcon } from './button';

export const Logo: React.FC<{ size?: number; className?: string }> = ({
  size = 32,
  className
}) => {
  const { theme } = useTheme();
  const isSSR = useIsSSR();
  const isDarkMode = theme === 'dark' && !isSSR;
  return (
    <Image
      className={className}
      src={isDarkMode ? '/logo_white.png' : '/logo_black.png'}
      width={size}
      height={size}
      alt="logo"
    />
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
