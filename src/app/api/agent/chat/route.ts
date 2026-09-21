import { NextRequest, NextResponse } from 'next/server';
import { agentService } from '@/server/services/ai/agent/agent.service';
import { createSSE } from '@/server/infra/sse';

interface ChatRequest {
  inputText: string;
  id?: string;
}

export async function POST(request: NextRequest) {
  try {
    const data: ChatRequest = await request.json();

    if (!data.inputText?.trim()) {
      return NextResponse.json({ error: '输入内容不能为空' }, { status: 400 });
    }

    const { response, controller } = createSSE();
    const handleAbort = () => controller.close();
    request.signal.addEventListener('abort', handleAbort, { once: true });

    void (async () => {
      try {
        if (request.signal.aborted) return;

        controller.sendMessage({
          id: data.id,
          status: 'loading',
          message: '正在处理请求…',
          type: 'text'
        });

        for await (const delta of agentService.stream(
          data.inputText.trim(),
          request.signal
        )) {
          if (request.signal.aborted) return;

          controller.sendMessage({
            id: data.id,
            status: 'streaming',
            message: delta,
            type: 'text'
          });
        }

        if (!request.signal.aborted) {
          // 正文已由 streaming 事件发送，终态不重复追加。
          controller.sendMessage({
            id: data.id,
            status: 'done',
            message: '',
            type: 'text'
          });
        }
      } catch (error) {
        console.error('Agent 聊天处理错误:', error);

        if (!request.signal.aborted) {
          controller.sendMessage({
            id: data.id,
            status: 'error',
            message: '处理请求时发生错误，请稍后重试',
            type: 'text'
          });
        }
      } finally {
        request.signal.removeEventListener('abort', handleAbort);
        controller.close();
      }
    })();

    return response;
  } catch (error) {
    console.error('Agent 聊天 API 错误:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}
