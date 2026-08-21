import clsx from 'clsx';
import NextLink from 'next/link';
import { ButtonHTMLAttributes, ReactNode } from 'react';

type LabButtonVariant = 'primary' | 'secondary' | 'ghost' | 'media';

/**
 * 铺色与位移共用的过渡。
 * 收尾极缓的曲线，让色块推到边缘时是「贴合」而不是「撞停」。
 */
const SWEEP_TRANSITION =
  'transition-transform duration-[450ms] ease-[cubic-bezier(0.16,1,0.3,1)]';

const VARIANT_CLASS: Record<LabButtonVariant, string> = {
  // 强调色实底。铺过去的是更深一档的强调色，读作「按下去了一层」
  primary: clsx(
    'border border-lab-accent bg-lab-accent text-lab-accent-ink',
    'hover:border-lab-accent-hover'
  ),
  // 描边按钮。铺满强调色后文字转为其上的反色；
  // 降低动效偏好时没有色块，文字退回强调色，否则会是浅字浅底
  secondary: clsx(
    'border border-lab-line-strong bg-transparent text-lab-paper',
    'hover:border-lab-accent hover:text-lab-accent-ink',
    'motion-reduce:hover:text-lab-accent'
  ),
  // 无描边。不铺整块，只在底边拉出一条强调色，分量与它的层级相称
  ghost: clsx(
    'border border-transparent bg-transparent text-lab-muted',
    'hover:text-lab-accent'
  ),
  // 用于压在照片/实底黑面板之上、不随亮暗主题翻转的场景（如首屏面板）。
  // 颜色全部取 on-media 系令牌，这套令牌在两个主题下取值相同；
  // 不能靠「secondary + 覆盖 className」拼出同样效果 —— 两组类名会同时
  // 作用在同一个元素上，谁生效取决于 Tailwind 生成 CSS 的顺序而非书写顺序，
  // secondary 自带的 text-lab-paper 在亮色主题下是深色，会在深色面板上失踪
  media: clsx(
    'border border-lab-on-media/40 bg-transparent text-lab-on-media',
    'hover:border-lab-on-media'
  )
};

/** 自左铺开的底色，null 表示该变体不铺整块 */
const SWEEP_CLASS: Record<LabButtonVariant, string | null> = {
  primary: 'bg-lab-accent-hover',
  secondary: 'bg-lab-accent',
  ghost: null,
  // 半透明白，而非 secondary 那种铺满的实色：media 变体的文字常态不换色，
  // 不透明的浅色底会把白字吃掉，半透明才能在铺开后仍然读得清
  media: 'bg-lab-on-media/12'
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
 *
 * 悬停由两个动作构成：强调色自左边缘推满整块，尾部图标同时向前挪一点。
 * 方向一致，读起来是「往前一步」，与直角网格的机械感也对得上。
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
    'group/btn relative isolate inline-flex h-11 cursor-pointer items-center',
    'justify-center gap-2 overflow-hidden',
    'px-5 lab-action whitespace-nowrap',
    'transition-colors duration-300',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lab-accent',
    VARIANT_CLASS[variant],
    disabled && 'pointer-events-none opacity-45',
    className
  );

  const sweep = SWEEP_CLASS[variant];

  const content = (
    <>
      {/* 自左铺开的色块。压在内容之下，故文字与图标始终可读 */}
      {sweep && (
        <span
          aria-hidden
          className={clsx(
            'absolute inset-0 -z-10 origin-left scale-x-0',
            SWEEP_TRANSITION,
            'group-hover/btn:scale-x-100',
            // 降低动效偏好时不铺色，仅保留描边与文字的颜色变化
            'motion-reduce:hidden',
            sweep
          )}
        />
      )}

      {/* ghost 没有描边可依托，改在底边拉一条强调色 */}
      {variant === 'ghost' && (
        <span
          aria-hidden
          className={clsx(
            'absolute inset-x-0 bottom-0 h-px origin-left scale-x-0 bg-lab-accent',
            SWEEP_TRANSITION,
            'group-hover/btn:scale-x-100',
            'motion-reduce:hidden'
          )}
        />
      )}

      {isLoading && (
        <span
          aria-hidden
          className="h-3 w-3 animate-spin border border-current border-t-transparent"
        />
      )}

      <span>{children}</span>

      {/* 图标随色块一起前移，两个动作同向 */}
      {endContent && (
        <span
          className={clsx(
            'inline-flex shrink-0',
            'transition-transform duration-[450ms] ease-[cubic-bezier(0.16,1,0.3,1)]',
            'group-hover/btn:translate-x-1',
            'motion-reduce:transition-none motion-reduce:group-hover/btn:translate-x-0'
          )}
        >
          {endContent}
        </span>
      )}
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
