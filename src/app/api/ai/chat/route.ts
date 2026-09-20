import { NextRequest, NextResponse } from 'next/server';
import { aiChatService } from '@/server/services/ai/chat.service';
import { createSSE } from '@/server/infra/sse';


interface ChatRequest {
  inputText: string;
  id?: string;
}

export async function POST(request: NextRequest) {
  let controller: ReturnType<typeof createSSE>['controller'] | null = null;

  try {
    const data: ChatRequest = await request.json();

    // 参数校验
    if (!data.inputText?.trim()) {
      return NextResponse.json({ error: '输入内容不能为空' }, { status: 400 });
    }

    const { response, controller: ctrl } = createSSE();
    controller = ctrl;

    // 异步处理流程
    (async () => {
      try {
        // 1. 发送加载状态
        controller!.sendMessage({
          id: data.id,
          status: 'loading',
          message: '正在解析意图...',
          type: 'text'
        });

        // 2. 解析意图
        const intention = await aiChatService.queryIntention(data.inputText);

        // 3. 根据意图处理
        if (intention.intent === 'PHOTO_SEARCH') {
          controller!.sendMessage({
            id: data.id,
            status: 'running',
            message: intention.reply,
            type: 'text'
          });

          const content = await aiChatService.queryPhotosByEmbedding(
            intention.embeddingDesc,
            intention.params
          );

          controller!.sendMessage({
            id: `${data.id}_photoCard`,
            status: 'done',
            message: '为您找到以下照片',
            type: 'photoCard',
            data: content
          });
        } else {
          controller!.sendMessage({
            id: data.id,
            status: 'done',
            message: intention.reply,
            type: 'text'
          });
        }
      } catch (err) {
        console.error('聊天处理错误:', err);
        controller!.sendMessage({
          id: data.id,
          status: 'error',
          message: '处理请求时发生错误，请稍后重试',
          type: 'text'
        });
      } finally {
        controller!.close();
      }
    })();

    return response;
  } catch (error) {
    console.error('AI 聊天 API 错误:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}
