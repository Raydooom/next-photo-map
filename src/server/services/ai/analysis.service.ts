import 'server-only';

import { imageAnalysisService } from './image-analysis';

/**
 * 兼容旧调用名的薄 facade。
 * 新代码应直接使用 image-analysis/ 中按职责拆分的服务；这里不再接受对象存储 key。
 */
class AIService {
  async createAiInfo(photo: { id: number }) {
    return imageAnalysisService.analyzePhoto(photo.id);
  }

  async updateEmbedding(photoId: number) {
    return imageAnalysisService.rebuildEmbeddings(photoId);
  }
}

export const aiService = new AIService();
