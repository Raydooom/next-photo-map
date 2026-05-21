import { NextRequest, NextResponse } from 'next/server';
import { AiChatService } from '@/server/services/chat.services';
import { createSSE } from '@/utils/request';

const chatService = new AiChatService();

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { response, controller } = createSSE();
    (async () => {
      controller.sendMessage({
        id: data.id,
        status: 'loading',
        message: '正在解析意图...',
        type: 'text'
      });
      // 发送流式意图解析结果
      const intention = await chatService.queryIntention(data.inputText);
      controller.sendMessage({
        id: data.id,
        status: 'running',
        message: intention.reply,
        type: 'text'
      });

      // 根据意图查询内容
      if (intention.intent === 'PHOTO_SEARCH') {
        const content = await chatService.queryPhotosByEmbedding(
          intention.embeddingDesc
        );

        controller.sendMessage({
          id: data.id + '_photoCard',
          status: 'done',
          message: '已完成',
          type: 'photoCard',
          data: content
        });
      } else {
        controller.sendMessage({
          id: data.id,
          status: 'done',
          message: intention.reply,
          type: 'text'
        });
      }
    })();

    return response;
  } catch (error) {
    console.error('AI 聊天 API 错误:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
