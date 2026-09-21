import { NextRequest, NextResponse } from 'next/server';
import {
  AgentConversationNotFoundError,
  conversationService
} from '@/server/services/ai/agent/conversation.service';
import {
  applyAgentVisitorCookie,
  resolveAgentVisitor
} from '../../_lib/visitor';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface RouteContext {
  params: Promise<{ conversationId: string }>;
}

function invalidConversationIdResponse() {
  return NextResponse.json({ error: '会话 ID 不合法' }, { status: 400 });
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { conversationId } = await context.params;
  if (!UUID_PATTERN.test(conversationId)) return invalidConversationIdResponse();

  const visitor = resolveAgentVisitor(request);

  try {
    const detail = await conversationService.getConversation(
      visitor.id,
      conversationId
    );
    const response = NextResponse.json(detail);
    applyAgentVisitorCookie(response, visitor);
    return response;
  } catch (error) {
    if (error instanceof AgentConversationNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    console.error('读取 Agent 会话失败:', error);
    return NextResponse.json({ error: '无法读取会话' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { conversationId } = await context.params;
  if (!UUID_PATTERN.test(conversationId)) return invalidConversationIdResponse();

  const visitor = resolveAgentVisitor(request);

  try {
    await conversationService.deleteConversation(visitor.id, conversationId);
    const response = NextResponse.json({ success: true });
    applyAgentVisitorCookie(response, visitor);
    return response;
  } catch (error) {
    if (error instanceof AgentConversationNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    console.error('删除 Agent 会话失败:', error);
    return NextResponse.json({ error: '无法删除会话' }, { status: 500 });
  }
}
