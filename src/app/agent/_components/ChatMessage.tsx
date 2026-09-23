'use client';

import clsx from 'clsx';
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
    </article>
  );
}

function LoadingMessage() {
  return (
    <div className="flex items-center gap-2.5">
      <span
        aria-hidden
        className="h-3 w-3 animate-spin border border-lab-muted border-t-transparent"
      />
      <span className="text-[13px] text-lab-muted">思考中</span>
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
