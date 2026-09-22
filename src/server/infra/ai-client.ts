import 'server-only';

import { getEmbeddingModel } from './chat-model';

/** 返回原始数值向量，领域服务负责维度校验和 pgvector 序列化。 */
export async function generateEmbeddingVector(value: string): Promise<number[]> {
  if (!value?.trim()) {
    throw new Error('向量化的文本不能为空');
  }

  try {
    return await getEmbeddingModel().embedQuery(value);
  } catch (error) {
    console.error('向量生成失败:', error);
    throw new Error('向量生成服务暂时不可用');
  }
}
