import 'server-only';

import { analysisEmbeddingService } from './embedding.service';
import { ImageAnalysisError, ImageAnalysisResult } from './contracts';
import { analysisRepository } from './analysis.repository';
import { visionAnalyzer } from './vision-analyzer';

export interface AnalyzePhotoResult extends ImageAnalysisResult {
  photoId: number;
  success: true;
}

class ImageAnalysisService {
  async listPhotoIds() {
    return analysisRepository.listPhotoIds();
  }

  /**
   * 单图分析唯一入口：只接受 photoId，服务端自行读取私有缩略图 key。
   * 不信任浏览器传来的完整照片对象或对象存储路径。
   */
  async analyzePhoto(photoId: number): Promise<AnalyzePhotoResult> {
    const photo = await analysisRepository.getPhotoInput(photoId);
    if (!photo) {
      throw new ImageAnalysisError('PHOTO_NOT_FOUND', '照片不存在');
    }

    const metadata = await visionAnalyzer.analyze(photo.thumbLargeKey);
    const embeddings = await analysisEmbeddingService.create(metadata);

    await analysisRepository.upsert(photo.id, metadata, embeddings);

    return { photoId: photo.id, ...metadata, success: true };
  }

  async rebuildEmbeddings(photoId: number) {
    const analysis = await analysisRepository.getStoredAnalysis(photoId);
    if (!analysis) return null;

    if (!analysis.description?.trim() || analysis.tags.length === 0) {
      throw new ImageAnalysisError(
        'EMBEDDING_FAILED',
        '现有图片分析缺少描述或标签，无法重建向量'
      );
    }

    const metadata: ImageAnalysisResult = {
      description: analysis.description,
      theme: analysis.theme,
      tags: analysis.tags
    };
    const embeddings = await analysisEmbeddingService.create(metadata);
    await analysisRepository.updateEmbeddings(photoId, embeddings);

    return { photoId, success: true };
  }
}

export const imageAnalysisService = new ImageAnalysisService();
