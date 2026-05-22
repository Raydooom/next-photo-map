import { PhotoService } from './photo.services';
import { prisma } from '../lib/db';
import { generateEmbedding, intentionAnalysis } from '../lib/ai';

// 意图类型枚举
export enum ChatIntent {
  PHOTO_SEARCH = 'PHOTO_SEARCH',
  PHOTO_ANALYSIS = 'PHOTO_ANALYSIS',
  GENERAL_CHAT = 'GENERAL_CHAT'
}

// 意图参数
export interface IntentionParams {
  keywords?: string;
  location?: string;
  time?: string;
  tone?: string;
  light?: string;
}

// 意图分析结果
export interface Intention {
  intent: ChatIntent;
  reasoning: string;
  params: IntentionParams;
  embeddingDesc: string;
  reply: string;
}

// 向量查询结果
interface PhotoMatch {
  id: number;
  semantic_distance: number;
}

const photoService = new PhotoService();

export class AiChatService {
  /**
   * 解析用户意图
   */
  async queryIntention(input: string): Promise<Intention> {
    const intention = await intentionAnalysis({
      input,
      intentions: Object.values(ChatIntent) as string[]
    });

    return intention as Intention;
  }

  /**
   * 根据向量描述搜索照片
   */
  async queryPhotosByEmbedding(
    embeddingDesc: string,
    _params?: IntentionParams,
    pageSize = 6
  ) {
    const embedding = await generateEmbedding(`search_query: ${embeddingDesc}`);
    const embeddingStr = `[${embedding.join(',')}]`;

    const photos: PhotoMatch[] = await prisma.$queryRawUnsafe(`
      SELECT 
        p.id, 
        pa.embedding::vector <=> '${embeddingStr}'::vector AS semantic_distance
      FROM "photos" p
      JOIN "photo_ai_analyses" pa ON p.id = pa.photo_id
      WHERE pa.embedding::vector <=> '${embeddingStr}'::vector < 0.8
      ORDER BY semantic_distance ASC
      LIMIT ${pageSize}
    `);

    if (photos.length === 0) {
      return { total: 0, list: [] };
    }

    return photoService.listPhotos({
      pageSize,
      ids: photos.map((photo) => photo.id)
    });
  }

  /**
   * 分析指定照片
   */
  async analyzePhoto(photoId: number) {
    const photo = await photoService.getPhotoById(photoId);
    if (!photo) {
      throw new Error('照片不存在');
    }
    // TODO: 实现照片分析逻辑
    return photo;
  }
}
