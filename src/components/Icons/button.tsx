import clsx from 'clsx';
import React from 'react';
import {
  AiOutlineInfo,
  AiOutlineClose,
  AiOutlineLeft,
  AiOutlineRight
} from 'react-icons/ai';
import {
  MdOutlineAdd,
  MdHorizontalRule,
  MdOutlineMyLocation
} from 'react-icons/md';
import { FaLocationArrow } from 'react-icons/fa6';
import { IoCameraOutline } from "react-icons/io5";


import { Button, ButtonProps } from '@heroui/button';

type IconButtonProps = {
  onClick?: () => void;
  className?: string;
} & ButtonProps;

const IconButton = ({
  children,
  onClick,
  className,
  ...rest
}: IconButtonProps & { children: React.ReactNode }) => (
  <Button
    radius="full"
    isIconOnly
    onPress={onClick}
    className={clsx(
      `bg-background/60 
      backdrop-blur-button shadow-xl text-xl
      w-[44px] h-[44px]
      `,
      className
    )}
    {...rest}
  >
    {children}
  </Button>
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

export const PlusIcon = (props: IconButtonProps) => (
  <IconButton {...props}>
    <MdOutlineAdd />
  </IconButton>
);

export const MinusIcon = (props: IconButtonProps) => (
  <IconButton {...props}>
    <MdHorizontalRule />
  </IconButton>
);

export const RotationIcon = (props: IconButtonProps) => (
  <IconButton {...props}>
    <FaLocationArrow className="-rotate-45 translate-y-[2px]" />
  </IconButton>
);

export const NavigationIcon = (props: IconButtonProps) => (
  <IconButton {...props}>
    <MdOutlineMyLocation />
  </IconButton>
);

export const ClusterPointIcon = (props: IconButtonProps) => (
  <IconButton {...props}>
    <IoCameraOutline />
  </IconButton>
);