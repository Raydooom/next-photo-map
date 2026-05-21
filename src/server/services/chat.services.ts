import { PhotoService } from './photo.services';
import { prisma } from '../lib/db';
import { generateEmbedding, intentionAnalysis } from '../lib/ai';

const INTENTIONS = ['PHOTO_SEARCH', 'PHOTO_ANALYSIS', 'GENERAL_CHAT'];
const photoService = new PhotoService();

interface MathPhoto {
  id: number;
  semantic_distance: number;
}

interface Intention {
  intent: string;
  reasoning: string;
  params: any;
  embeddingDesc: string;
  reply: string;
}

export class AiChatService {
  // ai意图解析
  async queryIntention(input: string): Promise<Intention> {
    const intention = await intentionAnalysis({
      input,
      intention: INTENTIONS.join(',')
    });

    return intention;
  }

  // 根据向量描述查询照片
  async queryPhotosByEmbedding(embeddingDesc: string, pageSize = 6) {
    const embedding = await generateEmbedding(`search_query: ${embeddingDesc}`);

    const photos: MathPhoto[] = await prisma.$queryRaw`
        SELECT 
          p.id, 
          -- 计算语义相似度 (向量距离)
          pa.embedding::vector <=> ${embedding}::vector AS semantic_distance
        FROM "photos" p
        JOIN "photo_ai_analyses" pa ON p.id = pa.photo_id
        -- 向量距离小于等于 0.5 为匹配照片
        WHERE pa.tag_embedding <=> ${embedding}::vector < 0.5
        ORDER BY 
          semantic_distance ASC  -- 优先按内容匹配度排序
        LIMIT ${pageSize};
      `;

    return await photoService.listPhotos({
      pageSize,
      ids: photos.map(photo => photo.id)
    });
  }
}
