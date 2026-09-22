import { NextRequest } from 'next/server';
import { batchAnalysisService } from '@/server/services/ai/image-analysis';
import { createSSE } from '@/server/infra/sse';
import { requireAdminResponse } from '@/server/auth';

export async function GET(request: NextRequest) {
  const denied = await requireAdminResponse();
  if (denied) return denied;

  const { response, controller } = createSSE();
  const signal = request.signal;

  void (async () => {
    try {
      for await (const event of batchAnalysisService.analyzeAll(signal)) {
        if (signal.aborted) return;

        const isDone = event.status === 'completed';
        const isCancelled = event.status === 'cancelled';
        controller.sendMessage({
          current: event.current,
          total: event.total,
          failed: event.failed,
          status: isDone ? 'done' : isCancelled ? 'killed' : 'loading',
          done: isDone,
          message: event.message,
          type: 'text'
        });
      }
    } catch (error) {
      console.error('批量图片分析任务出错:', error);
      if (!signal.aborted) {
        controller.sendMessage({
          status: 'error',
          message: '批量分析过程中发生错误',
          type: 'text'
        });
      }
    } finally {
      controller.close();
    }
  })();

  return response;
}
