'use client';
import Image from 'next/image';
import { useTheme } from 'next-themes';
import { useIsSSR } from '@react-aria/ssr';

export const Logo: React.FC<{ size?: number }> = ({ size = 32 }) => {
  // 获取当前是黑暗模式还是亮色模式
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark' && !useIsSSR();
  return (
    <Image
      src={isDarkMode ? '/logo_white.png' : '/logo_black.png'}
      width={size}
      height={size}
      alt="logo"
    />
  );
};
