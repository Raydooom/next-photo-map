import { prisma, Prisma } from '../lib/db';
import { getImageBase64 } from '../lib/oss';
import { generateAnalysis, generateEmbedding } from '../lib/ai';

export class AIService {
  // ai分析
  async analysis(key: string) {
    const base64Image = await getImageBase64(key);
    const cleanBase64 = base64Image.includes(',')
      ? base64Image.split(',')[1]
      : base64Image;
    const text = await generateAnalysis({
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `以一位专业的数字策展人和摄影评论家的视角来分析这张图片。
                请提供一份深入且精妙的分析（约 150 - 200 字），涵盖以下内容：
                  1. 摄影美学：评估构图（例如引导线、对称性）、光线质量以及色彩理论。
                  2. 时空背景：描述当时的氛围、季节以及具体时间，重点突出“场所之灵”（即该地点所蕴含的独特精神）。
                  3. 人文叙事：解读文化痕迹、情感内涵或视觉元素背后的故事。
                要求：
                  - 使用专业术语。
                  - 以流畅、富有诗意且严谨的学术风格进行书写。
                  - 避免使用诸如“我明白”或“此图像显示”这样的表述。
                  - 将分析内容整合成一个连贯的段落呈现。
                  - 根据分析结果，提取出照片的主要主题和关键元素。
                请只返回符合要求的 JSON 对象：
                  {
                    "description": "照片的详细描述",
                    "theme": "照片的主要主题或内容",
                    "tags": "照片的主要元素或特征，每个标签2-4个字符，标签之间用逗号隔开, 如：["雪山", "暖色调", "极简", "构图", "静"]"
                  }
              `
            },
            { type: 'image', image: cleanBase64 }
          ]
        }
      ]
    });
    const formattedDescription = text.replace(/```json\n|```/g, '').trim();
    const { description, theme, tags } = JSON.parse(formattedDescription);

    // 步骤 2: 让轻量文本模型“提炼标签”
    const embeddingStr = await generateEmbedding(
      `search_document: ${description}`
    );
    const tagEmbeddingStr = await generateEmbedding(
      `search_document: ${tags.join(',')}`
    );
    return {
      tags,
      theme,
      description,
      embeddingStr,
      tagEmbeddingStr
    };
  }

  // 将ai分析出的内容，存入数据
  async createAiInfo(photo: Prisma.PhotoGetPayload<{}>) {
    const { tags, description, theme, embeddingStr, tagEmbeddingStr } =
      await this.analysis(photo.thumbLargeKey);

    await prisma.$executeRaw`
      INSERT INTO "photo_ai_analyses" 
        (photo_id, theme, description, tags, embedding, tag_embedding, updated_at)
      VALUES 
        (${photo.id}, ${theme}, ${description}, ${tags}, ${embeddingStr}::vector, ${tagEmbeddingStr}::vector, NOW())
      ON CONFLICT (photo_id) 
      DO UPDATE SET
        description = EXCLUDED.description,
        tags = EXCLUDED.tags,
        embedding = EXCLUDED.embedding,
        tag_embedding = EXCLUDED.tag_embedding,
        updated_at = NOW();
    `;
    return { tags, description, theme, success: true };
  }

  // 根据当前照片的分析结果，更新向量
  async updateEmbedding(photoId: number) {
    const photo = await prisma.photoAiAnalysis.findUnique({
      where: { photoId }
    });

    if (!photo) return null;

    const vectorString = await generateEmbedding(photo.description || '');
    const tagVectorString = await generateEmbedding(photo.tags.join(',') || '');

    await prisma.$executeRaw`
      UPDATE "photo_ai_analyses" 
        SET embedding = ${vectorString}::vector,
        tag_embedding = ${tagVectorString}::vector,
        updated_at = NOW()
      WHERE photo_id = ${photoId};
    `;
  }
}
