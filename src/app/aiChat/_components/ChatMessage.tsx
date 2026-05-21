'use client';

import { Avatar } from '@heroui/avatar';
import { Card, CardBody } from '@heroui/card';
import { Spinner } from '@heroui/spinner';
import { Sparkles } from 'lucide-react';
import { cn } from '@heroui/theme';
import { Message } from './types';

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <div className={cn('flex gap-3', isUser ? 'flex-row-reverse' : 'flex-row')}>
      {/* Avatar */}
      <div className="flex-shrink-0">
        {isUser ? (
          <Avatar
            size="sm"
            src="https://i.pravatar.cc/150?u=a042581f4e29026704d"
            className="ring-2 ring-primary/20"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-secondary to-primary flex items-center justify-center">
            <Sparkles size={14} className="text-white" />
          </div>
        )}
      </div>

      {/* 消息内容 */}
      <div className={cn('flex-1 max-w-[80%]', isUser && 'flex justify-end')}>
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
    <Card className="bg-content2 border border-divider/50">
      <CardBody className="py-3 px-4">
        <div className="flex items-center gap-2">
          <Spinner size="sm" color="primary" />
          <span className="text-sm text-default-500">正在思考中...</span>
        </div>
      </CardBody>
    </Card>
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
    <Card
      className={cn(
        'border',
        isUser
          ? 'bg-primary text-primary-foreground border-primary'
          : 'bg-content2 border-divider/50'
      )}
    >
      <CardBody className="py-3 px-4">
        <p className="text-sm whitespace-pre-wrap leading-relaxed">
          {message.content}
        </p>
      </CardBody>
    </Card>
  );
}

function PhotoCardMessage({ message }: { message: Message }) {
  return (
    <div className="space-y-2">
      <Card className="bg-content2 border border-divider/50">
        <CardBody className="py-3 px-4">
          <p className="text-sm text-default-600">{message.content}</p>
        </CardBody>
      </Card>
      <div className="grid grid-cols-2 gap-2">
        {message.data.list.slice(0, 4).map((photo: any) => (
          <div
            key={photo.id}
            className="relative group rounded-xl overflow-hidden aspect-square bg-content2"
          >
            <img
              src={photo.thumbLargeUrl}
              alt={photo.filename || ''}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="absolute bottom-2 left-2 right-2">
                <p className="text-xs text-white/80 truncate">
                  {photo.filename}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
