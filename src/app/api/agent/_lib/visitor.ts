import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';

const AGENT_VISITOR_COOKIE = 'agent_visitor_id';
const VISITOR_ID_MAX_AGE = 60 * 60 * 24 * 180;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface AgentVisitor {
  id: string;
  isNew: boolean;
}

/**
 * 登录接入前，以 HTTP-only 随机 cookie 隔离不同浏览器的会话历史。
 * 它不是认证凭据；接入登录后由用户身份替换此归属键。
 */
export function resolveAgentVisitor(request: NextRequest): AgentVisitor {
  const cookieValue = request.cookies.get(AGENT_VISITOR_COOKIE)?.value;

  if (cookieValue && UUID_PATTERN.test(cookieValue)) {
    return { id: cookieValue, isNew: false };
  }

  return { id: randomUUID(), isNew: true };
}

export function applyAgentVisitorCookie(
  response: NextResponse,
  visitor: AgentVisitor
) {
  if (!visitor.isNew) return;

  response.cookies.set({
    name: AGENT_VISITOR_COOKIE,
    value: visitor.id,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: VISITOR_ID_MAX_AGE
  });
}
