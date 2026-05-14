import { NextResponse } from 'next/server';

export interface SSEMessage {
  step: string;
  status: string;
  message: string;
  duration?: number;
  isDetail?: boolean;
}

export interface SSEController {
  sendMessage: (data: Record<string, any>) => void;
  sendDetailLog: (
    step: string,
    type: 'stdout' | 'stderr',
    message: string
  ) => void;
  sendKilledMessage: () => void;
  close: () => void;
}

export interface SSEResult {
  response: NextResponse;
  controller: SSEController;
}

export const createSSE = (): SSEResult => {
  const encoder = new TextEncoder();
  let streamController: ReadableStreamDefaultController | null = null;

  const sendMessage = (data: Record<string, any>) => {
    if (streamController) {
      const message = `data: ${JSON.stringify(data)}\n\n`;
      streamController.enqueue(encoder.encode(message));
    }
  };

  const sendDetailLog = (
    step: string,
    type: 'stdout' | 'stderr',
    message: string
  ) => {
    const lines = message.split('\n').filter(line => line.trim());
    for (const line of lines) {
      sendMessage({
        step,
        status: type,
        message: line,
        isDetail: true
      });
    }
  };

  const sendKilledMessage = () => {
    sendMessage({ step: 'done', status: 'killed', message: '操作已停止' });
  };

  const close = () => {
    if (streamController) {
      streamController.close();
      streamController = null;
    }
  };

  const stream = new ReadableStream({
    start(controller) {
      streamController = controller;
    },
    cancel() {
      streamController = null;
    }
  });

  const response = new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'X-Accel-Buffering': 'no' // 关键：禁用 Nginx 缓存，确保流式输出即时
    }
  });

  return {
    response,
    controller: {
      sendMessage,
      sendDetailLog,
      sendKilledMessage,
      close
    }
  };
};
