'use client';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ReactNode, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/** 可获得焦点的元素，用于把 Tab 圈在对话框内 */
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(',');

/** 层级取 200：高于页面内已在用的 z-[100]（地图控件） */
const Z_INDEX = 'z-[200]';

/**
 * 打开动效：从视图中心放大弹出，spring 过冲一点做出果冻感。
 * bounce 是回弹幅度而非时长，配合较短的 duration 才会显出「弹一下」，
 * 数值调大会更 Q 弹，调到 0 就是纯粹的减速停止。
 */
const OPEN_SPRING = { type: 'spring', duration: 0.55, bounce: 0.32 } as const;

/** 关闭动效：直接淡出收小，不带回弹 —— 消失的东西没必要再弹一下 */
const CLOSE_TRANSITION = { duration: 0.22, ease: 'easeIn' } as const;

/** 遮罩淡入淡出的时长 */
const OVERLAY_FADE_DURATION = 0.25;

/** 打开前的初始缩放，越小「从中心弹出」的感觉越明显 */
const INITIAL_SCALE = 0.85;

interface FullscreenDialogProps {
  isOpen: boolean;
  onClose: () => void;
  /** 对话框的无障碍名称 */
  label: string;
  children: ReactNode;
}

/**
 * 铺满视口的对话框。
 *
 * 自行实现而非取用组件库：这里需要的只是遮罩、进出场、Esc 关闭、
 * 滚动锁定与焦点管理这几件事，为此挂一整套弹层组件并不划算，
 * 也方便后续把 heroui 摘干净。
 *
 * 内容区不做内边距与容器样式，全部交给使用方 —— 全屏查看器要自己
 * 排布顶栏底栏，任何外层留白都会碍事。
 */
export function FullscreenDialog({
  isOpen,
  onClose,
  label,
  children
}: FullscreenDialogProps) {
  const shouldReduce = useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);
  // portal 目标只能在客户端取到，故等挂载后再渲染
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  useEffect(() => setPortalTarget(document.body), []);

  /**
   * 锁住页面滚动。
   * 同时补上滚动条消失让出的宽度，否则背后的页面会横向跳一下。
   */
  useEffect(() => {
    if (!isOpen) return;

    const { body, documentElement } = document;
    const scrollbarWidth = window.innerWidth - documentElement.clientWidth;
    const previousOverflow = body.style.overflow;
    const previousPaddingRight = body.style.paddingRight;

    body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
      body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      body.style.overflow = previousOverflow;
      body.style.paddingRight = previousPaddingRight;
    };
  }, [isOpen]);

  /**
   * 键盘与焦点。
   * 打开时把焦点移入面板、关闭后还给触发它的元素；
   * Tab 在面板内首尾相接，避免焦点跑到背后那层不可见的页面上。
   */
  useEffect(() => {
    if (!isOpen) return;

    const previousActive = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }

      if (event.key !== 'Tab' || !panelRef.current) return;

      // offsetParent 为空即当前不可见（如断点下隐藏的翻页键），不参与循环
      const focusables = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      ).filter((node) => node.offsetParent !== null);

      if (focusables.length === 0) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previousActive?.focus();
    };
  }, [isOpen, onClose]);

  if (!portalTarget) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className={`fixed inset-0 ${Z_INDEX}`}>
          {/* 遮罩单独一层，好让它与面板各走各的时长 */}
          <motion.div
            aria-hidden
            className="absolute inset-0 bg-black/80"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{
              duration: shouldReduce ? 0 : OVERLAY_FADE_DURATION
            }}
          />

          {/* 面板从视图中心放大弹出：transform-origin 取中心（默认值），
              故 scale 是围绕正中心展开，而非从某一角展开。
              打开用 spring 带一点回弹做出果冻感；关闭改用无回弹的缓出，
              收缩时还带弹性会显得粘滞、拖泥带水 */}
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={label}
            // 面板本身可聚焦，作为焦点移入的落点
            tabIndex={-1}
            className="absolute inset-0 outline-none"
            initial={{ opacity: 0, scale: shouldReduce ? 1 : INITIAL_SCALE }}
            animate={{
              opacity: 1,
              scale: 1,
              transition: shouldReduce ? { duration: 0 } : OPEN_SPRING
            }}
            exit={{
              opacity: 0,
              scale: shouldReduce ? 1 : INITIAL_SCALE,
              transition: shouldReduce ? { duration: 0 } : CLOSE_TRANSITION
            }}
          >
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    portalTarget
  );
}
