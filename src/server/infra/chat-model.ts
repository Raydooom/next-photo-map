import 'server-only';

import { ChatOpenAI } from '@langchain/openai';
import { ChatOllama, OllamaEmbeddings } from '@langchain/ollama';

export type FoundationModelName = 'qw' | 'ollama';

function normalizeOllamaBaseUrl(value?: string) {
  return (value || 'http://localhost:11434').replace(/\/?api\/?$/, '');
}

const ollamaBaseUrl = normalizeOllamaBaseUrl(
  process.env.OLLAMA_API_URL || process.env.OLLAMA_BASE_URL
);

const models: Record<FoundationModelName, ChatOpenAI | ChatOllama> = {
  qw: new ChatOpenAI({
    model: process.env.QWEN_MODEL || 'qwen3.8-max',
    apiKey: process.env.QWEN_API_KEY!,
    configuration: { baseURL: process.env.QWEN_API_URL },
    temperature: 0
  }),
  ollama: new ChatOllama({
    model: process.env.AGENT_MODEL || 'qwen3:4b-q4_K_M',
    baseUrl: ollamaBaseUrl,
    temperature: 0
  })
};

const embeddingModel = new OllamaEmbeddings({
  model: process.env.EMBEDDING_MODEL || 'bge-m3',
  baseUrl: ollamaBaseUrl
});

/** Agent 使用的文字模型入口，不初始化 LangGraph checkpoint。 */
export function getFoundationChatModel(
  model: FoundationModelName = 'ollama'
) {
  return models[model];
}

/** 图片视觉模型：通过本地 Ollama 调用多模态模型，与 Agent 文本模型独立配置。 */
export function getVisionChatModel() {
  return new ChatOllama({
    model: process.env.IMAGE_ANALYSIS_MODEL || 'qwen3-vl:2b',
    baseUrl: ollamaBaseUrl,
    temperature: 0
  });
}

/** bge-m3 的 LangChain embedding 模型入口。 */
export function getEmbeddingModel() {
  return embeddingModel;
}
