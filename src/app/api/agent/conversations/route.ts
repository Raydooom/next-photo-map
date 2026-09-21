import { NextRequest, NextResponse } from 'next/server';
import { conversationService } from '@/server/services/ai/agent/conversation.service';
import {
  applyAgentVisitorCookie,
  resolveAgentVisitor
} from '../_lib/visitor';

export async function GET(request: NextRequest) {
  const visitor = resolveAgentVisitor(request);

  try {
    const conversations = await conversationService.listConversations(visitor.id);
    const response = NextResponse.json({ conversations });
    applyAgentVisitorCookie(response, visitor);
    return response;
  } catch (error) {
    console.error('读取 Agent 会话列表失败:', error);
    return NextResponse.json({ error: '无法读取会话列表' }, { status: 500 });
  }
}
