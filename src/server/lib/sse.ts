import { NextResponse } from 'next/server';

export interface SSEMessage {
  id?: string;
  status: 'done' | 'killed' | 'running' | 'success' | 'error' | 'loading';
  message: string;
  duration?: number;
  type?: 'text' | 'photoCard';
  data?: any;
  [key: string]: any;
}

export interface SSEController {
  id?: string;
  sendMessage: (data: SSEMessage) => void;
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

  const sendMessage = (data: SSEMessage) => {
    if (streamController) {
      const message = `data: ${JSON.stringify(data)}\n\n`;
      streamController.enqueue(encoder.encode(message));
    }
  };

  const sendKilledMessage = () => {
    sendMessage({ status: 'killed', message: '操作已停止', type: 'text' });
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
      sendKilledMessage,
      close
    }
  };
};
