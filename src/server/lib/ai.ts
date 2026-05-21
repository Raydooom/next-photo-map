import { ollama } from 'ollama-ai-provider-v2';
import { generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { embed } from 'ai';

// 向量模型
const EMBEDDING_MODEL = 'bge-m3';

// 魔搭图片描述模型
const MODEL_SCOPE_IMAGE_DESC_MODEL = 'Qwen/Qwen3.5-35B-A3B';
const MODEL_SCOPE_KEY = 'ms-772d1363-fe02-4275-8444-492d23f9205e';

type GenerateAnalysisOptions = {
  messages: any[];
  temperature?: number;
  useOllama?: boolean;
};

// 生成图片描述
export const generateAnalysis = async ({
  messages,
  temperature = 0
}: GenerateAnalysisOptions) => {
  const openai = createOpenAI({
    apiKey: MODEL_SCOPE_KEY,
    baseURL: 'https://api-inference.modelscope.cn/v1/'
  });
  const res = await generateText({
    model: openai(MODEL_SCOPE_IMAGE_DESC_MODEL),
    messages,
    temperature
  });
  return res.text;
};

// 转换向量
export const generateEmbedding = async (value: string): Promise<string> => {
  const { embedding } = await embed({
    model: ollama.embedding(EMBEDDING_MODEL),
    value
  });
  const embeddingStr = `[${embedding.join(',')}]`;
  return embeddingStr;
};

// 意图分析
export const intentionAnalysis = async ({
  input = '',
  intention,
  temperature = 0
}: {
  input: string;
  intention: string;
  temperature?: number;
}) => {
  const { text } = await generateText({
    model: ollama('qwen2.5:7b'),
    system: `
        # Role
        你是一个摄影地图助手系统的意图解析引擎。

        # Task
        解析用户输入，并输出符合以下 JSON 格式的指令。

        # Response Format
        {
          "intent": "${intention}",
          "reasoning": "简短说明为什么要判定为此意图",
          "params": { 根据意图填充参数，提取关键词、地点、时间等信息,
            格式如下: { 
              "keywords": "关键词1,关键词2", 
              "location": "地点", 
              "time": "描述的季节或月份", 
              "tone": "色调",
              "light": "光影",
            }
          },
          "embeddingDesc": "提炼用户意图的向量描述",
          "reply": "回复给用户的内容，不要在追问"
        }

        # Rules
        - 如果用户说“想看...附近”，意图必须是 PHOTO_SEARCH。
        - 如果用户提到“构图、地理、故事”，意图必须是 PHOTO_ANALYSIS。
        - 必须严格输出 JSON，不要包含任何多余文字。`,
    prompt: input,
    temperature
  });

  console.log("👾 ~ :91 ~ intentionAnalysis ~ textlog:", text)

  return JSON.parse(text);
};
