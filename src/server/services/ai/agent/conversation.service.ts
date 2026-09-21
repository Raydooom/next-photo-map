import 'server-only';

import {
  AgentMessageKind,
  AgentMessageRole,
  AgentMessageStatus,
  Prisma
} from '@prisma/client';
import type { PhotoItem } from '@/lib/types/photo';
import type {
  AgentConversationDetail,
  AgentConversationMessage,
  AgentConversationSummary
} from '@/lib/contracts/agent-conversation';
import { prisma } from '@/server/infra/db';
import { photoService } from '@/server/services/photo/photo.service';

const PREVIEW_LENGTH = 72;
const TITLE_LENGTH = 30;

export class AgentConversationNotFoundError extends Error {
  constructor() {
    super('会话不存在或无权访问');
    this.name = 'AgentConversationNotFoundError';
  }
}

type PhotoReference = {
  photoId: number;
  position: number;
};

type MessageWithPhotoResults = Prisma.AgentMessageGetPayload<{
  include: {
    photoResults: {
      orderBy: { position: 'asc' };
    };
  };
}>;

function normalizeText(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function createTitle(input: string) {
  const normalized = normalizeText(input);
  return normalized.slice(0, TITLE_LENGTH) || '新对话';
}

function createPreview(input: string) {
  const normalized = normalizeText(input);
  return normalized.slice(0, PREVIEW_LENGTH) || '暂无消息';
}

function uniquePhotoIds(photoIds?: number[]) {
  if (!photoIds) return [];
  return [...new Set(photoIds.filter((id) => Number.isInteger(id) && id > 0))];
}

async function hydratePhotoReferences(
  references: PhotoReference[]
): Promise<PhotoItem[]> {
  if (references.length === 0) return [];

  const photos = await photoService.getPhotosByIds(
    references.map((reference) => reference.photoId)
  );
  const photoById = new Map(photos.map((photo) => [photo.id, photo]));

  return [...references]
    .sort((left, right) => left.position - right.position)
    .map((reference) => photoById.get(reference.photoId))
    .filter((photo): photo is PhotoItem => Boolean(photo));
}

function toMessageDto(
  message: Prisma.AgentMessageGetPayload<Record<string, never>>,
  photos?: PhotoItem[]
): AgentConversationMessage {
  return {
    id: message.id,
    conversationId: message.conversationId,
    role: message.role === AgentMessageRole.USER ? 'user' : 'assistant',
    kind: message.kind === AgentMessageKind.PHOTO_RESULTS ? 'photoResults' : 'text',
    status:
      message.status === AgentMessageStatus.INTERRUPTED
        ? 'interrupted'
        : message.status === AgentMessageStatus.ERROR
          ? 'error'
          : 'completed',
    content: message.content,
    photoTotal: message.photoTotal,
    ...(photos && photos.length > 0 ? { photos } : {}),
    createdAt: message.createdAt.toISOString()
  };
}

function toSummary(
  conversation: Prisma.AgentConversationGetPayload<Record<string, never>>,
  preview: string
): AgentConversationSummary {
  return {
    id: conversation.id,
    title: conversation.title,
    preview,
    createdAt: conversation.createdAt.toISOString(),
    updatedAt: conversation.updatedAt.toISOString()
  };
}

async function getNextSequence(
  tx: Prisma.TransactionClient,
  conversationId: string
) {
  const lastMessage = await tx.agentMessage.findFirst({
    where: { conversationId },
    orderBy: { sequence: 'desc' },
    select: { sequence: true }
  });

  return (lastMessage?.sequence ?? 0) + 1;
}

class ConversationService {
  async listConversations(visitorId: string): Promise<AgentConversationSummary[]> {
    const conversations = await prisma.agentConversation.findMany({
      where: { visitorId },
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      take: 50,
      include: {
        messages: {
          orderBy: { sequence: 'desc' },
          take: 1
        }
      }
    });

    return conversations.map(({ messages, ...conversation }) =>
      toSummary(conversation, createPreview(messages[0]?.content ?? ''))
    );
  }

  async getConversation(
    visitorId: string,
    conversationId: string
  ): Promise<AgentConversationDetail> {
    const conversation = await prisma.agentConversation.findFirst({
      where: { id: conversationId, visitorId },
      include: {
        messages: {
          orderBy: { sequence: 'asc' },
          include: {
            photoResults: {
              orderBy: { position: 'asc' }
            }
          }
        }
      }
    });

    if (!conversation) throw new AgentConversationNotFoundError();

    const { messages, ...conversationRow } = conversation;
    const allReferences = messages.flatMap((message) => message.photoResults);
    const photos = await hydratePhotoReferences(allReferences);
    const photoById = new Map(photos.map((photo) => [photo.id, photo]));

    return {
      conversation: toSummary(
        conversationRow,
        createPreview(messages.at(-1)?.content ?? '')
      ),
      messages: messages.map((message) => {
        const messagePhotos = message.photoResults
          .map((reference) => photoById.get(reference.photoId))
          .filter((photo): photo is PhotoItem => Boolean(photo));

        return toMessageDto(message, messagePhotos);
      })
    };
  }

  async startTurn({
    visitorId,
    conversationId,
    inputText
  }: {
    visitorId: string;
    conversationId?: string;
    inputText: string;
  }) {
    return prisma.$transaction(async tx => {
      const conversation = conversationId
        ? await tx.agentConversation.findFirst({
            where: { id: conversationId, visitorId }
          })
        : await tx.agentConversation.create({
            data: {
              visitorId,
              title: createTitle(inputText)
            }
          });

      if (!conversation) throw new AgentConversationNotFoundError();

      const userMessage = await tx.agentMessage.create({
        data: {
          conversationId: conversation.id,
          sequence: await getNextSequence(tx, conversation.id),
          role: AgentMessageRole.USER,
          kind: AgentMessageKind.TEXT,
          status: AgentMessageStatus.COMPLETED,
          content: inputText
        }
      });

      const updatedConversation = await tx.agentConversation.update({
        where: { id: conversation.id },
        data: {
          updatedAt: new Date(),
          title:
            conversation.title === '新对话' ? createTitle(inputText) : undefined
        }
      });

      return {
        conversation: toSummary(updatedConversation, createPreview(inputText)),
        userMessage: toMessageDto(userMessage)
      };
    });
  }

  async appendAssistantMessage({
    visitorId,
    conversationId,
    content,
    status = AgentMessageStatus.COMPLETED,
    kind = AgentMessageKind.TEXT,
    photoIds,
    photoTotal
  }: {
    visitorId: string;
    conversationId: string;
    content: string;
    status?: AgentMessageStatus;
    kind?: AgentMessageKind;
    photoIds?: number[];
    photoTotal?: number;
  }): Promise<AgentConversationMessage> {
    const orderedPhotoIds = uniquePhotoIds(photoIds);

    const message = await prisma.$transaction(async tx => {
      const conversation = await tx.agentConversation.findFirst({
        where: { id: conversationId, visitorId },
        select: { id: true }
      });

      if (!conversation) throw new AgentConversationNotFoundError();

      const created = await tx.agentMessage.create({
        data: {
          conversationId,
          sequence: await getNextSequence(tx, conversationId),
          role: AgentMessageRole.ASSISTANT,
          kind,
          status,
          content,
          photoTotal: kind === AgentMessageKind.PHOTO_RESULTS ? photoTotal : null,
          ...(orderedPhotoIds.length > 0
            ? {
                photoResults: {
                  create: orderedPhotoIds.map((photoId, position) => ({
                    photoId,
                    position
                  }))
                }
              }
            : {})
        }
      });

      await tx.agentConversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() }
      });

      return created;
    });

    const photos = await hydratePhotoReferences(
      orderedPhotoIds.map((photoId, position) => ({ photoId, position }))
    );

    return toMessageDto(message, photos);
  }

  async deleteConversation(visitorId: string, conversationId: string) {
    const result = await prisma.agentConversation.deleteMany({
      where: { id: conversationId, visitorId }
    });

    if (result.count === 0) throw new AgentConversationNotFoundError();
  }
}

/** 应用层会话记录的唯一入口；LangGraph checkpoint 不作为 UI 历史数据源。 */
export const conversationService = new ConversationService();
