import clsx from 'clsx';
import React from 'react';
import {
  AiOutlineInfo,
  AiOutlineClose,
  AiOutlineLeft,
  AiOutlineRight
} from 'react-icons/ai';

type IconButtonProps = {
  onClick: () => void;
  className?: string;
};

// 第一步：抽取公共的 Span 容器组件
const IconButton = ({
  children,
  onClick,
  className
}: IconButtonProps & { children: React.ReactNode }) => (
  <span
    className={clsx(
      `
        inline-block p-2 rounded-full cursor-pointer text-xl
        bg-background/70
        backdrop-blur-xl
        border border-white/20 dark:border-white/10
        active:opacity-80
        shadow-[0_4px_24px_0_rgba(0,0,0,0.05)]
        transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]
        hover:bg-background/40 hover:shadow-[0_25px_50px_rgba(0,0,0,0.15)]
        active:scale-110 active:backdrop-blur-[40px]
      `,
      className
    )}
    onClick={onClick}
  >
    {children}
  </span>
);

export const InfoIcon = (props: IconButtonProps) => (
  <IconButton {...props}>
    <AiOutlineInfo />
  </IconButton>
);

export const CloseIcon = (props: IconButtonProps) => (
  <IconButton {...props}>
    <AiOutlineClose />
  </IconButton>
);

export const LeftIcon = (props: IconButtonProps) => (
  <IconButton {...props}>
    <AiOutlineLeft />
  </IconButton>
);

export const RightIcon = (props: IconButtonProps) => (
  <IconButton {...props}>
    <AiOutlineRight />
  </IconButton>
);
