import { NextRequest, NextResponse } from 'next/server';
import { AiChatService } from '@/server/services/chat.services';
import { createSSE } from '@/utils/request';

const chatService = new AiChatService();

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { response, controller } = createSSE();

    const intention = await chatService.queryIntention(data.inputText);
    controller.sendMessage({ intention });
    const content = await chatService.queryContent(intention);

    controller.sendMessage({ content });

    return response;
  } catch (error) {
    console.error('AI 聊天 API 错误:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}
