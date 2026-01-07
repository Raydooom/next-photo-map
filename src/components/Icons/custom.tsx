'use client';
import Image from 'next/image';
import { useTheme } from 'next-themes';
import { useIsSSR } from '@react-aria/ssr';
import { LeftIcon } from './button';

export const Logo: React.FC<{ size?: number }> = ({ size = 32 }) => {
  const { theme } = useTheme();
  const isSSR = useIsSSR();
  const isDarkMode = theme === 'dark' && !isSSR;
  return (
    <Image
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
