'use client';

import Image from 'next/image';
import clsx from 'clsx';
import { Eyebrow } from '@/components/ui';
import { Message } from './types';

interface ChatMessageProps {
  message: Message;
}

/**
 * 单条消息。
 *
 * 单栏纵向流，不做左右分列 —— 后者是 IM 的形式，隐喻「两人对坐」，
 * 而这里是一个人查archive，没有对话双方可言；站内其余区块也都是左对齐网格。
 * 身份交给顶部的等宽标签，正文因此不需要气泡来划定归属：
 * AI 的回答是这一页的主体内容，按正文排版直接落在底色上，
 * 用户的提问只在左侧加一条竖线标记。
 */
export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <article className={clsx(isUser && 'border-l-2 border-lab-accent pl-4')}>
      {/* 角色名取拉丁词，正好落在 lab-mono 的适用范围内 */}
      <Eyebrow as="h3" className={isUser ? 'text-lab-accent' : undefined}>
        {isUser ? 'You' : 'Agent'}
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
    </article>
  );
}

function LoadingMessage() {
  return (
    <div className="flex items-center gap-2.5">
      {/* 与 LabButton 的加载态同一个写法：方形描边旋转，不用组件库的 Spinner */}
      <span
        aria-hidden
        className="h-3 w-3 animate-spin border border-lab-muted border-t-transparent"
      />
      <span className="text-[13px] text-lab-muted">思考中</span>
    </div>
  );
}

function PhotoCardMessage({ message }: { message: Message }) {
  const photos = message.data.list.slice(0, 4);

  return (
    <div>
      <p className="lab-body whitespace-pre-wrap text-lab-paper">
        {message.content}
      </p>

      {/* 照片本身是方的，这里保留描边与网格 —— 是全页唯一该有格子的地方 */}
      <div className="mt-4 grid max-w-md grid-cols-2 gap-2">
        {photos.map((photo: any) => (
          <figure
            key={photo.id}
            className="group/photo relative aspect-square overflow-hidden border border-lab-line bg-lab-sunken"
          >
            <Image
              src={photo.thumbLargeUrl}
              alt={photo.filename || ''}
              fill
              sizes="(max-width: 768px) 45vw, 220px"
              className="object-cover transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/photo:scale-105"
            />
            <figcaption
              className={clsx(
                'absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-1.5',
                'opacity-0 transition-opacity duration-300 group-hover/photo:opacity-100'
              )}
            >
              <span className="lab-mono block truncate text-lab-on-media">
                {photo.filename}
              </span>
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}
