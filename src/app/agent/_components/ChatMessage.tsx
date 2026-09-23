'use client';

import clsx from 'clsx';
import { motion, useReducedMotion } from 'motion/react';
import { formatDateCN } from '@/lib/format';
import { Eyebrow } from '@/components/ui';
import { AgentPhotoGrid } from './AgentPhotoGrid';
import { Message } from './types';

interface ChatMessageProps {
  message: Message;
}

/**
 * 单条消息。
 *
 * 单栏纵向流，不做左右分列 —— 后者是 IM 的形式，隐喻「两人对坐」，
 * 而这里是一个人查 archive，没有对话双方可言；站内其余区块也都是左对齐网格。
 */
export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const shouldReduce = useReducedMotion();

  return (
    <article className={clsx(isUser && 'border-l-2 border-lab-accent pl-4')}>
      <Eyebrow as="h3" className={isUser ? 'text-lab-accent' : undefined}>
        {isUser ? '' : 'AI智能助手'}
      </Eyebrow>

      <div className="mt-2.5">
        {message.status === 'loading' ? (
          <LoadingMessage />
        ) : message.type === 'photoCard' && message.data?.list ? (
          <PhotoCardMessage message={message} />
        ) : (
          <p className="lab-body whitespace-pre-wrap text-lab-paper">
            {message.content}
          </p>
        )}
      </div>

      {/* 时间戳与分隔线等本轮作答结束才出现：回答还在写的时候先落一条收尾线，
          等同于提前宣布这条已经完了，与上方仍在动的等待态自相矛盾 */}
      {!isUser && message.status === 'done' && (
        <motion.footer
          className="mt-5 border-b border-lab-line pb-2.5"
          initial={shouldReduce ? false : { opacity: 0 }}
          animate={shouldReduce ? undefined : { opacity: 1 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        >
          <p className="lab-mono text-xs tracking-[0.04em] text-lab-faint dark:text-lab-on-media-muted/80">
            {formatDateCN(message.timestamp)}
          </p>
        </motion.footer>
      )}
    </article>
  );
}

/** 竖条根数。5 根够读出起伏的节奏，再多在行内会显得吵 */
const SCAN_BARS = [0, 1, 2, 3, 4];

/**
 * 等待态：档案检索的「扫描」。
 *
 * 不用转圈 —— 圆形 spinner 与这套直角网格语言不搭；FocusLoader（取景框对焦）
 * 是整页级载入的体量，压在单条消息里过重。
 *
 * 三层各管一件事：竖条起伏交代「正在算」，文案上掠过的高光交代「还在继续」，
 * 底下 1px 轨道上扫过的游标交代「进度不可知」。只留竖条的话，
 * 起伏到低谷的那一拍会像是停住了。
 */
function LoadingMessage() {
  const shouldReduce = useReducedMotion();

  return (
    <div
      className="inline-flex flex-col gap-2"
      role="status"
      aria-label="正在检索照片档案"
    >
      <div className="flex items-center gap-2.5">
        {/* transformOrigin 取 bottom：竖条从底边长起，读作柱状起落而非居中缩放 */}
        <span aria-hidden className="flex h-4 items-end gap-[3px]">
          {SCAN_BARS.map((index) => (
            <motion.span
              key={index}
              className="block h-full w-[2px] bg-lab-accent"
              style={{ transformOrigin: 'bottom' }}
              animate={
                shouldReduce
                  ? { scaleY: 0.55, opacity: 0.65 }
                  : { scaleY: [0.22, 1, 0.22], opacity: [0.35, 1, 0.35] }
              }
              transition={
                shouldReduce
                  ? { duration: 0 }
                  : {
                      duration: 1.1,
                      ease: 'easeInOut',
                      repeat: Infinity,
                      // 逐根错开，形成从左往右推过去的波形
                      delay: index * 0.12
                    }
              }
            />
          ))}
        </span>

        {/* 高光动的是 backgroundPositionX：单值百分比 motion 能稳定插值，
            background-position 简写则未必 */}
        <motion.span
          className="bg-clip-text text-[13px] leading-none text-transparent"
          style={{
            backgroundImage:
              'linear-gradient(90deg, oklch(var(--lab-faint)) 0%, oklch(var(--lab-paper)) 50%, oklch(var(--lab-faint)) 100%)',
            backgroundSize: '220% 100%'
          }}
          animate={
            shouldReduce
              ? { backgroundPositionX: '50%' }
              : { backgroundPositionX: ['130%', '-130%'] }
          }
          transition={
            shouldReduce
              ? { duration: 0 }
              : { duration: 1.9, ease: 'linear', repeat: Infinity }
          }
        >
          正在检索照片档案
        </motion.span>
      </div>

      {/* 游标宽度取轨道的 1/3，x 用百分比（相对自身宽度）从左端外扫到右端外 */}
      <span
        aria-hidden
        className="relative block h-px w-32 overflow-hidden bg-lab-line"
      >
        <motion.span
          className="absolute inset-y-0 left-0 w-1/3 bg-lab-accent"
          animate={shouldReduce ? { x: '100%' } : { x: ['-100%', '300%'] }}
          transition={
            shouldReduce
              ? { duration: 0 }
              : { duration: 1.5, ease: [0.16, 1, 0.3, 1], repeat: Infinity }
          }
        />
      </span>
    </div>
  );
}

function PhotoCardMessage({ message }: { message: Message }) {
  const photos = message.data?.list ?? [];
  const total = message.data?.total ?? photos.length;

  return (
    <div>
      {message.content && (
        <p className="lab-body whitespace-pre-wrap text-lab-paper">
          {message.content}
        </p>
      )}
      {message.photoResultsVisible !== false && (
        <AgentPhotoGrid
          photos={photos}
          total={total}
          animate={message.animatePhotoResults === true}
        />
      )}
    </div>
  );
}
