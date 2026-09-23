import { AgentMessageKind, AgentMessageStatus } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  AgentConversationNotFoundError,
  conversationService
} from '@/server/services/ai/agent/conversation.service';
import { agentService } from '@/server/services/ai/agent/agent.service';
import { photoService } from '@/server/services/photo/photo.service';
import { createSSE } from '@/server/infra/sse';
import {
  applyAgentVisitorCookie,
  resolveAgentVisitor
} from '../_lib/visitor';

const chatRequestSchema = z.object({
  inputText: z.string().trim().min(1, '输入内容不能为空').max(4000),
  conversationId: z.string().uuid().optional()
});

const AGENT_ERROR_MESSAGE = '处理请求时发生错误，请稍后重试';
const AGENT_EMPTY_MESSAGE = '没有生成可展示的回答';

type PhotoResultState = {
  photoIds: number[];
  total: number;
};

async function hydratePhotos(photoIds: number[]) {
  const photos = await photoService.getPhotosByIds(photoIds);
  const photoById = new Map(photos.map((photo) => [photo.id, photo]));

  return photoIds
    .map((photoId) => photoById.get(photoId))
    .filter((photo) => Boolean(photo));
}

export async function POST(request: NextRequest) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: '请求体必须是 JSON' }, { status: 400 });
  }

  const parsed = chatRequestSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? '请求参数不合法' },
      { status: 400 }
    );
  }

  const visitor = resolveAgentVisitor(request);
  let turn;

  try {
    turn = await conversationService.startTurn({
      visitorId: visitor.id,
      conversationId: parsed.data.conversationId,
      inputText: parsed.data.inputText
    });
  } catch (error) {
    if (error instanceof AgentConversationNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    console.error('创建 Agent 会话消息失败:', error);
    return NextResponse.json({ error: '无法创建会话消息' }, { status: 500 });
  }

  const { response, controller } = createSSE();
  applyAgentVisitorCookie(response, visitor);

  const handleAbort = () => controller.close();
  request.signal.addEventListener('abort', handleAbort, { once: true });

  void (async () => {
    let accumulatedText = '';
    const photoResult: PhotoResultState = { photoIds: [], total: 0 };

    const persistAssistantMessage = (
      content: string,
      status: AgentMessageStatus = AgentMessageStatus.COMPLETED
    ) =>
      conversationService.appendAssistantMessage({
        visitorId: visitor.id,
        conversationId: turn.conversation.id,
        content,
        status,
        kind:
          photoResult.photoIds.length > 0
            ? AgentMessageKind.PHOTO_RESULTS
            : AgentMessageKind.TEXT,
        photoIds: photoResult.photoIds,
        photoTotal: photoResult.total || photoResult.photoIds.length
      });

    try {
      if (request.signal.aborted) return;

      controller.sendMessage({
        status: 'loading',
        message: '正在处理请求…',
        type: 'text',
        data: {
          conversationId: turn.conversation.id,
          userMessage: turn.userMessage
        }
      });

      for await (const event of agentService.stream({
        conversationId: turn.conversation.id,
        userMsg: parsed.data.inputText,
        signal: request.signal
      })) {
        if (request.signal.aborted) return;

        if (event.type === 'text') {
          accumulatedText += event.delta;
          controller.sendMessage({
            status: 'streaming',
            message: event.delta,
            type: 'text',
            data: { conversationId: turn.conversation.id }
          });
          continue;
        }

        for (const photoId of event.photoIds) {
          if (!photoResult.photoIds.includes(photoId)) {
            photoResult.photoIds.push(photoId);
          }
        }

        const photos = await hydratePhotos(photoResult.photoIds);
        if (photos.length === 0) continue;

        photoResult.total = photos.length;

        controller.sendMessage({
          status: 'photo-results',
          message: `找到 ${photoResult.total} 张相关照片`,
          type: 'photoCard',
          data: {
            conversationId: turn.conversation.id,
            photoResult: {
              toolCallId: event.toolCallId,
              toolName: event.toolName,
              query: event.query,
              total: photoResult.total,
              photos
            }
          }
        });
      }

      if (request.signal.aborted) return;

      const assistantMessage = await persistAssistantMessage(
        accumulatedText || AGENT_EMPTY_MESSAGE
      );

      controller.sendMessage({
        status: 'done',
        message: '',
        type: 'text',
        data: {
          conversationId: turn.conversation.id,
          assistantMessage
        }
      });
    } catch (error) {
      if (request.signal.aborted) return;

      console.error('Agent 聊天处理错误:', error);

      const assistantMessage = await persistAssistantMessage(
        accumulatedText || AGENT_ERROR_MESSAGE,
        AgentMessageStatus.ERROR
      ).catch((persistError) => {
        console.error('保存 Agent 错误消息失败:', persistError);
        return null;
      });

      controller.sendMessage({
        status: 'error',
        message: AGENT_ERROR_MESSAGE,
        type: 'text',
        data: {
          conversationId: turn.conversation.id,
          assistantMessage
        }
      });
    } finally {
      if (request.signal.aborted && accumulatedText) {
        await persistAssistantMessage(
          accumulatedText,
          AgentMessageStatus.INTERRUPTED
        ).catch((error) => console.error('保存中断消息失败:', error));
      }

      request.signal.removeEventListener('abort', handleAbort);
      controller.close();
    }
  })();

  return response;
}
