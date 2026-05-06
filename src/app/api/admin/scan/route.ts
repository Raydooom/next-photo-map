import { NextRequest } from 'next/server';
import { ScannerService } from '@/server/services/admin.services';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const force = searchParams.get('force') === 'true';

  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    async start(controller) {
      const scannerService = new ScannerService();
      
      const sendEvent = (data: any) => {
        const message = `data: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(message));
      };

      scannerService.setProgressCallback((progressData) => {
        sendEvent(progressData);
      });

      try {
        await scannerService.startScanner(force);
        sendEvent({ type: 'end', message: '扫描结束' });
      } catch (error) {
        sendEvent({ 
          type: 'error', 
          message: '扫描出错', 
          error: error instanceof Error ? error.message : '未知错误' 
        });
      } finally {
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
