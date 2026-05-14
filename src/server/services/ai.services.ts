import { ollama } from 'ollama-ai-provider-v2';
import { generateText, embed } from 'ai';
import { prisma, Prisma } from '../lib/db';
import { getImageBase64 } from '../lib/oss';

// 图片描述模型
const IMAGE_DESC_MODEL = process.env.IMAGE_DESC_MODEL || 'moondream';
// 翻译模型，关键词提取
const TRANSLATE_MODEL = process.env.TRANSLATE_MODEL || 'qwen2.5:1.5b';
// 向量模型
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || 'nomic-embed-text';

export class AIService {
  // 生成向量描述
  static async generateEmbedding(value: string) {
    const { embedding } = await embed({
      model: ollama.embedding(EMBEDDING_MODEL),
      value: value
    });
    return embedding;
  }
  // ai分析
  async analysis(key: string) {
    const base64Image = await getImageBase64(key);
    const cleanBase64 = base64Image.includes(',')
      ? base64Image.split(',')[1]
      : base64Image;

    const { text: description } = await generateText({
      model: ollama(IMAGE_DESC_MODEL),
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analyze this image as a professional digital curator and photography critic. 
                Please provide a deep, sophisticated analysis (approx. 150-200 words) covering:
                1. Photographic Aesthetics: Evaluate composition (e.g., leading lines, symmetry), lighting quality, and color theory.
                2. Spatiotemporal Context: Describe the atmosphere, season, and time of day, focusing on the "Genius Loci" (spirit of the place).
                3. Humanistic Narrative: Interpret cultural traces, emotional undertones, or the story behind the visual elements.

                Requirements:
                - Use professional terminology.
                - Write in a fluid, poetic, yet academic tone.
                - Avoid phrases like "I see" or "This image shows".
                - Output the analysis in a single cohesive paragraph.
              `
            },
            { type: 'image', image: cleanBase64 }
          ]
        }
      ],
      temperature: 0 // 设置为 0，降低随机性，防止模型“发疯”输出感叹号
    });

    const { text: chineseDescription } = await generateText({
      model: ollama(TRANSLATE_MODEL),
      system: `你是一个专业的摄影描述翻译器。`,
      prompt: `请从以下英文描述中翻译为中文：\n${description}\n请开始输出：`,
      temperature: 0
    });

    const { text: tags } = await generateText({
      model: ollama(TRANSLATE_MODEL),
      system: `你是一位精通摄影美学、人文地理和文学创作的资深编辑。
        你的任务是将输入的英文视觉分析描述（由图像识别模型生成），转化并润色为三个不同视角的中文专业文案。
      【核心规则】：
        1. 主题提取：从描述中提取出照片的主要主题或内容。
        2. 构图/光影/色调描述：根据主题，描述照片的构图方法、光影效果、色调等。
        3. 时间/季节/场景提取：从描述中提取出与照片时间、季节、场景相关的关键词。
        5. 只能输出关键词，禁止输出序号（如 1. 2. 3.）。
        6. 关键词之间必须用英文逗号隔开。
        7. 禁止输出任何开场白（如“好的”、“根据描述...”）。
      `,
      prompt: `请从以下描述中提取2~5个简短的摄影标签，每个标签2-4个字符，标签之间用英文逗号隔开：\n${chineseDescription}\n\n标签示例：雪山, 暖色调, 极简, 构图, 宁静\n请开始输出：`,
      temperature: 0
    });

    // 步骤 2: 让轻量文本模型“提炼标签”
    const embedding = await AIService.generateEmbedding(
      `search_document: ${chineseDescription}`
    );

    return {
      tags: tags.split(',').map(tag => tag.trim()),
      description,
      chineseDescription,
      embedding
    };
  }

  // 将ai分析出的内容，存入数据
  async createAiInfo(photo: Prisma.PhotoGetPayload<{}>) {
    const { tags, description, chineseDescription, embedding } =
      await this.analysis(photo.thumbSmallKey);
    const vectorString = `[${embedding.join(',')}]`;

    await prisma.$executeRaw`
      INSERT INTO "photo_ai_analyses" 
        (photo_id, description, chinese_description, tags, embedding, updated_at)
      VALUES 
        (${photo.id}, ${description}, ${chineseDescription}, ${tags}, ${vectorString}::vector, NOW())
      ON CONFLICT (photo_id) 
      DO UPDATE SET
        description = EXCLUDED.description,
        chinese_description = EXCLUDED.chinese_description,
        tags = EXCLUDED.tags,
        embedding = EXCLUDED.embedding,
        updated_at = NOW();
    `;
    return { tags, description, chineseDescription, success: true };
  }
}
