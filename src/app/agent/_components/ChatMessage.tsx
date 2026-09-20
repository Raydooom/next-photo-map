'use client';

import Image from 'next/image';
import clsx from 'clsx';
import { Sparkles, User } from 'lucide-react';
import { Message } from './types';

interface ChatMessageProps {
  message: Message;
}

/** 两侧的身份标记。方框描边，与侧栏的 logo 处理同一套 */
function Marker({ isUser }: { isUser: boolean }) {
  return (
    <span
      aria-hidden
      className={clsx(
        'flex h-7 w-7 shrink-0 items-center justify-center border',
        isUser
          ? 'border-lab-line-strong text-lab-muted'
          : 'border-lab-accent text-lab-accent'
      )}
    >
      {isUser ? <User size={13} /> : <Sparkles size={13} />}
    </span>
  );
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <div className={clsx('flex gap-3', isUser && 'flex-row-reverse')}>
      <Marker isUser={isUser} />

      <div className={clsx('min-w-0 max-w-[82%]', isUser && 'flex justify-end')}>
        {message.status === 'loading' ? (
          <LoadingMessage />
        ) : message.type === 'photoCard' && message.data?.list ? (
          <PhotoCardMessage message={message} />
        ) : (
          <TextMessage message={message} isUser={isUser} />
        )}
      </div>
    </div>
  );
}

function LoadingMessage() {
  return (
    <div className="flex items-center gap-2.5 border border-lab-line bg-lab-raised px-4 py-3">
      {/* 与 LabButton 的加载态同一个写法：方形描边旋转，不用组件库的 Spinner */}
      <span
        aria-hidden
        className="h-3 w-3 animate-spin border border-lab-accent border-t-transparent"
      />
      <span className="lab-mono text-xs text-lab-muted">思考中</span>
    </div>
  );
}

function TextMessage({
  message,
  isUser
}: {
  message: Message;
  isUser: boolean;
}) {
  return (
    <div
      className={clsx(
        'border px-4 py-3',
        // 用户消息用强调色描边点明来源，AI 消息退回常规面板
        isUser
          ? 'border-lab-accent bg-lab-accent-faint text-lab-paper'
          : 'border-lab-line bg-lab-raised text-lab-paper'
      )}
    >
      <p className="whitespace-pre-wrap text-sm leading-relaxed">
        {message.content}
      </p>
    </div>
  );
}

function PhotoCardMessage({ message }: { message: Message }) {
  const photos = message.data.list.slice(0, 4);

  return (
    <div className="space-y-2">
      <div className="border border-lab-line bg-lab-raised px-4 py-3">
        <p className="text-sm leading-relaxed text-lab-paper">
          {message.content}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
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
            {/* 文件名压在底部承托渐变上，仅悬停时出现 */}
            <figcaption
              className={clsx(
                'absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-1.5',
                'opacity-0 transition-opacity duration-300 group-hover/photo:opacity-100'
              )}
            >
              <span className="lab-mono block truncate text-[11px] text-lab-on-media">
                {photo.filename}
              </span>
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}
