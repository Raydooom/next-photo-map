import clsx from 'clsx';
import NextLink from 'next/link';
import { ButtonHTMLAttributes, ReactNode } from 'react';

type LabButtonVariant = 'primary' | 'secondary' | 'ghost';

const VARIANT_CLASS: Record<LabButtonVariant, string> = {
  // 强调色实底
  primary: clsx(
    'border border-lab-accent bg-lab-accent text-lab-accent-ink',
    'hover:border-lab-accent-hover hover:bg-lab-accent-hover'
  ),
  // 描边按钮
  secondary: clsx(
    'border border-lab-line-strong bg-transparent text-lab-paper',
    'hover:border-lab-accent hover:text-lab-accent'
  ),
  // 无描边
  ghost: clsx(
    'border border-transparent bg-transparent text-lab-muted',
    'hover:text-lab-paper'
  )
};

interface LabButtonBaseProps {
  children: ReactNode;
  variant?: LabButtonVariant;
  className?: string;
  /** 尾部图标等附加内容 */
  endContent?: ReactNode;
  isLoading?: boolean;
  isDisabled?: boolean;
}

interface LabButtonProps
  extends LabButtonBaseProps,
    Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof LabButtonBaseProps> {
  /** 传入则渲染为链接 */
  href?: string;
  /** 链接是否在新标签页打开 */
  isExternal?: boolean;
}

/**
 * 直角按钮。
 * 无圆角、无阴影，仅靠 1px 描边与强调色区分层级，高度 44px 满足移动端触控目标。
 */
export function LabButton({
  children,
  variant = 'secondary',
  className,
  endContent,
  isLoading = false,
  isDisabled = false,
  href,
  isExternal = false,
  ...rest
}: LabButtonProps) {
  const disabled = isDisabled || isLoading;

  const classes = clsx(
    'group/btn inline-flex h-11 items-center justify-center gap-2',
    'px-5 lab-action whitespace-nowrap',
    'transition-colors duration-200',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lab-accent',
    VARIANT_CLASS[variant],
    disabled && 'pointer-events-none opacity-45',
    className
  );

  const content = (
    <>
      {isLoading && (
        <span
          aria-hidden
          className="h-3 w-3 animate-spin border border-current border-t-transparent"
        />
      )}
      <span>{children}</span>
      {endContent}
    </>
  );

  if (href) {
    return (
      <NextLink
        href={href}
        className={classes}
        aria-disabled={disabled || undefined}
        {...(isExternal
          ? { target: '_blank', rel: 'noopener noreferrer' }
          : null)}
      >
        {content}
      </NextLink>
    );
  }

  return (
    <button type="button" className={classes} disabled={disabled} {...rest}>
      {content}
    </button>
  );
}
