import 'server-only';

import { imageAnalysisService } from './image-analysis.service';

export type BatchAnalysisEvent = {
  current: number;
  total: number;
  succeeded: number;
  failed: number;
  photoId?: number;
  status: 'progress' | 'completed' | 'cancelled';
  message: string;
};

class BatchAnalysisService {
  /**
   * 先保持串行，避免视觉模型、Ollama 和 MinIO 同时高负载。
   * 单张失败记录后继续下一张，批量路由不再因一张异常整体中断。
   */
  async *analyzeAll(signal?: AbortSignal): AsyncGenerator<BatchAnalysisEvent> {
    const photoIds = await imageAnalysisService.listPhotoIds();
    const total = photoIds.length;
    let succeeded = 0;
    let failed = 0;

    if (total === 0) {
      yield {
        current: 0,
        total: 0,
        succeeded,
        failed,
        status: 'completed',
        message: '没有需要分析的照片'
      };
      return;
    }

    for (let index = 0; index < photoIds.length; index++) {
      const photoId = photoIds[index];
      if (signal?.aborted) {
        yield {
          current: index,
          total,
          succeeded,
          failed,
          status: 'cancelled',
          message: '已停止分析'
        };
        return;
      }

      try {
        await imageAnalysisService.analyzePhoto(photoId);
        succeeded++;
      } catch (error) {
        failed++;
        console.error(`图片 ${photoId} 分析失败:`, error);
      }

      yield {
        current: index + 1,
        total,
        succeeded,
        failed,
        photoId,
        status: index + 1 === total ? 'completed' : 'progress',
        message:
          index + 1 === total
            ? `分析完成：成功 ${succeeded} 张，失败 ${failed} 张`
            : `正在分析照片 ${index + 1}/${total}`
      };
    }
  }
}

export const batchAnalysisService = new BatchAnalysisService();
