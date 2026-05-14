import { ollama } from 'ollama-ai-provider-v2';
import { generateText } from 'ai';
import { AIService } from './ai.services';
import { PhotoService } from './photo.services';
import { prisma } from '../lib/db';

const INTENTIONS = ['PHOTO_SEARCH', 'PHOTO_ANALYSIS', 'GENERAL_CHAT'];
const photoService = new PhotoService();

interface MathPhoto {
  id: number;
  semantic_distance: number;
}

export class AiChatService {
  // ai意图解析
  async queryIntention(input: string) {
    const { text: intention } = await generateText({
      model: ollama(process.env.INFERENCE_MODEL!),
      system: `
        # Role
        你是一个摄影地图助手系统的意图解析引擎。

        # Task
        解析用户输入，并输出符合以下 JSON 格式的指令。

        # Response Format
        {
          "intent": "${INTENTIONS.join('|')}",
          "reasoning": "简短说明为什么要判定为此意图",
          "params": { 根据意图填充参数，提取关键词、地点、时间等信息,
            格式如下: { 
              "keywords": "关键词1,关键词2", 
              "location": "地点", 
              "time": "时间", 
              "tone": "色调",
              "light": "光影",
            }
          },
          "embeddingDesc": "传给向量模型搜索的描述",
          "reply": "回复给用户的内容，回复自然一点，不要太机械"
        }

        # Rules
        - 如果用户说“想看...附近”，意图必须是 PHOTO_SEARCH。
        - 如果用户提到“构图、地理、故事”，意图必须是 PHOTO_ANALYSIS。
        - 必须严格输出 JSON，不要包含任何多余文字。`,
      prompt: input,
      temperature: 0
    });

    console.log(
      '👾 ~ :32 ~ AiChatService ~ queryIntention ~ intention:',
      intention
    );

    return JSON.parse(intention);
  }

  async queryContent(intention: any, pageSize = 4) {
    if (intention.intent === 'PHOTO_SEARCH') {
      const embedding = await AIService.generateEmbedding(
        `search_query: ${intention.embeddingDesc}`
      );
      const embeddingStr = `[${embedding.join(',')}]`;

      const photos: MathPhoto[] = await prisma.$queryRaw`
        SELECT 
          p.id, 
          -- 计算语义相似度 (向量距离)
          pa.embedding <=> ${embeddingStr}::vector AS semantic_distance
        FROM "photos" p
        JOIN "photo_ai_analyses" pa ON p.id = pa.photo_id
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
}
