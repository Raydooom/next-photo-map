import { AgentMessageStatus } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  AgentConversationNotFoundError,
  conversationService
} from '@/server/services/ai/agent/conversation.service';
import { agentService } from '@/server/services/ai/agent/agent.service';
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

      for await (const delta of agentService.stream({
        conversationId: turn.conversation.id,
        userMsg: parsed.data.inputText,
        signal: request.signal
      })) {
        if (request.signal.aborted) return;

        accumulatedText += delta;
        controller.sendMessage({
          status: 'streaming',
          message: delta,
          type: 'text',
          data: { conversationId: turn.conversation.id }
        });
      }

      if (request.signal.aborted) return;

      const assistantMessage = await conversationService.appendAssistantMessage({
        visitorId: visitor.id,
        conversationId: turn.conversation.id,
        content: accumulatedText || AGENT_EMPTY_MESSAGE
      });

      // 正文已经由 streaming 事件发出，终态仅同步持久化后的消息标识。
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

      const assistantMessage = await conversationService
        .appendAssistantMessage({
          visitorId: visitor.id,
          conversationId: turn.conversation.id,
          content: accumulatedText || AGENT_ERROR_MESSAGE,
          status: AgentMessageStatus.ERROR
        })
        .catch(persistError => {
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
        await conversationService
          .appendAssistantMessage({
            visitorId: visitor.id,
            conversationId: turn.conversation.id,
            content: accumulatedText,
            status: AgentMessageStatus.INTERRUPTED
          })
          .catch(error => console.error('保存中断消息失败:', error));
      }

      request.signal.removeEventListener('abort', handleAbort);
      controller.close();
    }
  })();

  return response;
}
