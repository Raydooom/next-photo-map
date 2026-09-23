import 'server-only';

import { generateEmbeddingVector } from '@/server/infra/ai-client';
import {
  ImageAnalysisError,
  ImageAnalysisResult
} from './contracts';

export const EMBEDDING_DIMENSION = 1024;

export interface AnalysisEmbeddings {
  descriptionVector: string;
  tagVector: string;
}

function toPgVector(vector: number[]) {
  if (
    vector.length !== EMBEDDING_DIMENSION ||
    vector.some((value) => !Number.isFinite(value))
  ) {
    throw new ImageAnalysisError(
      'VECTOR_DIMENSION_MISMATCH',
      `向量维度必须为 ${EMBEDDING_DIMENSION}`
    );
  }

  return `[${vector.join(',')}]`;
}

class AnalysisEmbeddingService {
  async create(metadata: ImageAnalysisResult): Promise<AnalysisEmbeddings> {
    try {
      const [description, tags] = await Promise.all([
        generateEmbeddingVector(`search_document: ${metadata.description}`),
        generateEmbeddingVector(`search_document: ${metadata.tags.join(',')}`)
      ]);

      return {
        descriptionVector: toPgVector(description),
        tagVector: toPgVector(tags)
      };
    } catch (error) {
      if (error instanceof ImageAnalysisError) throw error;
      throw new ImageAnalysisError(
        'EMBEDDING_FAILED',
        '图片分析向量生成失败',
        error
      );
    }
  }

  async createQueryVector(query: string): Promise<string> {
    const normalizedQuery = query.trim();
    if (!normalizedQuery) {
      throw new ImageAnalysisError('EMBEDDING_FAILED', '语义查询内容不能为空');
    }

    try {
      const vector = await generateEmbeddingVector(
        `search_query: ${normalizedQuery}`
      );
      return toPgVector(vector);
    } catch (error) {
      if (error instanceof ImageAnalysisError) throw error;
      throw new ImageAnalysisError(
        'EMBEDDING_FAILED',
        '语义查询向量生成失败',
        error
      );
    }
  }
}

export const analysisEmbeddingService = new AnalysisEmbeddingService();
