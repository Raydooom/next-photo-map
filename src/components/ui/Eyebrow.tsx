import clsx from 'clsx';
import { ElementType, ReactNode } from 'react';

interface EyebrowProps {
  children: ReactNode;
  className?: string;
  /** 渲染的标签，默认 span */
  as?: ElementType;
}

/**
 * 等宽小标签。
 * 用于章节编号、元信息行、区块前导文案（eyebrow）。
 */
export function Eyebrow({ children, className, as: Tag = 'span' }: EyebrowProps) {
  return (
    <Tag className={clsx('lab-mono text-lab-muted', className)}>{children}</Tag>
  );
}
