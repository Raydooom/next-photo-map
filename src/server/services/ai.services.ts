import { ollama } from 'ollama-ai-provider-v2';
import { generateText } from 'ai';

export class AIService {
  async generateTags(base64Image: string): Promise<string[]> {
    const cleanBase64 = base64Image.includes(',')
      ? base64Image.split(',')[1]
      : base64Image;

    const { text: description } = await generateText({
      model: ollama('moondream'),
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `What is in this image? Describe in detail.`
            },
            { type: 'image', image: cleanBase64 }
          ]
        }
      ],
      temperature: 0 // 设置为 0，降低随机性，防止模型“发疯”输出感叹号
    });

    // 步骤 2: 让轻量文本模型“提炼标签”
    const { text: tags } = await generateText({
      model: ollama('qwen2.5:1.5b'),
      system: `你是一个数据提取专家。
      【核心规则】：
      1. 只能输出中文。
      2. 只能输出关键词，禁止输出序号（如 1. 2. 3.）。
      3. 关键词之间必须用中文逗号隔开。
      4. 禁止输出任何开场白（如“好的”、“根据描述...”）。
      5. 禁止输出英文。`,
      prompt: `请从以下英文描述中提取5个中文摄影标签：\n${description}\n\n标签示例：雪山, 暖色调, 极简, 构图, 宁静\n请开始输出：`,
      temperature: 0
    });

    return tags.split(',').map(tag => tag.trim());
  }
}
