import { createOllama } from 'ollama-ai-provider-v2';
import { generateText, embed } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';

// ============ 模型配置 ============
const AI_CONFIG = {
  // 向量模型
  embedding: {
    model: process.env.EMBEDDING_MODEL || 'bge-m3',
    provider: 'ollama'
  },
  // 本地推理模型
  inference: {
    model: process.env.INFERENCE_MODEL || 'qwen2.5:7b',
    provider: 'ollama'
  },
  // 魔搭图片描述模型
  imageAnalysis: {
    model: process.env.IMAGE_ANALYSIS_MODEL || 'Qwen/Qwen3.5-35B-A3B',
    provider: 'modelscope',
    apiKey:
      process.env.MODEL_SCOPE_KEY || 'ms-772d1363-fe02-4275-8444-492d23f9205e',
    baseURL: 'https://api-inference.modelscope.cn/v1/'
  }
} as const;

// ============ 类型定义 ============
interface GenerateAnalysisOptions {
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string | Array<{ type: string; text?: string; image?: string }>;
  }>;
  temperature?: number;
}

interface IntentionAnalysisOptions {
  input: string;
  intentions: string[];
  temperature?: number;
}

interface IntentionResult {
  intent: string;
  reasoning: string;
  params: {
    keywords?: string;
    location?: string;
    time?: string;
    tone?: string;
    light?: string;
  };
  embeddingDesc: string;
  reply: string;
}

const ollama = createOllama({
  // 从环境变量中读取，如果没有则 fallback 到 host.docker.internal
  baseURL: process.env.OLLAMA_BASE_URL || 'http://localhost:11434/api'
});

// ============ 导出函数 ============

/**
 * 生成图片分析描述
 */
export async function generateAnalysis({
  messages,
  temperature = 0
}: GenerateAnalysisOptions): Promise<string> {
  try {
    const openai = createOpenAI({
      apiKey: AI_CONFIG.imageAnalysis.apiKey,
      baseURL: AI_CONFIG.imageAnalysis.baseURL
    });

    const { text } = await generateText({
      model: openai(AI_CONFIG.imageAnalysis.model),
      messages: messages as any,
      temperature
    });

    return text;
  } catch (error) {
    console.error('图片分析失败:', error);
    throw new Error('图片分析服务暂时不可用');
  }
}

/**
 * 生成向量嵌入
 */
export async function generateEmbedding(value: string): Promise<string> {
  if (!value?.trim()) {
    throw new Error('向量化的文本不能为空');
  }

  try {
    const { embedding } = await embed({
      model: ollama.embedding(AI_CONFIG.embedding.model),
      value
    });

    return `[${embedding.join(',')}]`;
  } catch (error) {
    console.error('向量生成失败:', error);
    throw new Error('向量生成服务暂时不可用');
  }
}

/**
 * 意图分析
 */
export async function intentionAnalysis({
  input,
  intentions,
  temperature = 0
}: IntentionAnalysisOptions): Promise<IntentionResult> {
  if (!input?.trim()) {
    throw new Error('输入内容不能为空');
  }

  try {
    const { text } = await generateText({
      model: ollama(AI_CONFIG.inference.model),
      system: buildIntentionSystemPrompt(intentions),
      prompt: input,
      temperature
    });

    // 清理可能的 markdown 代码块标记
    const cleanText = text.replace(/```json\n?|```/g, '').trim();
    return JSON.parse(cleanText);
  } catch (error) {
    console.error('意图分析失败:', error);

    // 返回默认意图
    return {
      intent: 'GENERAL_CHAT',
      reasoning: '解析失败，使用默认意图',
      params: {},
      embeddingDesc: input,
      reply: '抱歉，我暂时无法理解您的请求，请换一种方式描述。'
    };
  }
}

// ============ 辅助函数 ============
function buildIntentionSystemPrompt(intentions: string[]): string {
  return `
    # Role
    你是一个摄影地图助手系统的意图解析引擎。

    # Task
    解析用户输入，并输出符合以下 JSON 格式的指令。

    # Response Format
    {
      "intent": "${intentions.join('|')}",
      "reasoning": "简短说明为什么要判定为此意图",
      "params": {
        "keywords": "关键词1,关键词2",
        "location": "地点",
        "time": "描述的季节或月份",
        "tone": "色调",
        "light": "光影"
      },
      "embeddingDesc": "提炼用户意图的向量描述，用于照片搜索",
      "reply": "回复给用户的内容，简洁自然，不要追问"
    }

    # Rules
    - 如果用户说"想看...附近"、"找...照片"，意图必须是 PHOTO_SEARCH。
    - 如果用户提到"构图、光影、分析这张照片"，意图必须是 PHOTO_ANALYSIS。
    - 必须严格输出 JSON，不要包含任何多余文字。
    - embeddingDesc 应该是用于向量搜索的描述性文本，提取照片的关键特征。
    `;
}
