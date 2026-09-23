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
    temperature: 0,
    /**
     * 关掉 qwen3 的思考模式。
     *
     * 它默认开启，每轮会先生成一大段 <think>…</think>。本 Agent 需要的
     * 只是一次工具调用决策，且有照片时最终正文还会被服务端换成固定摘要，
     * 这些思考 token 在 CPU 推理下是纯粹的等待。
     *
     * 注意：换成不支持 thinking 的模型（如 qwen2.5 系列）时必须删掉此项，
     * Ollama 对不支持该能力的模型会直接返回 400。
     */
    think: false
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

/**
 * Agent 的模型来源。默认本地 ollama；AGENT_PROVIDER=qw 时改走千问云端。
 *
 * 低配机器（纯 CPU）上本地 4B 模型的 prefill 只有个位数 token/s，
 * 一次带工具调用的对话要分钟级；把这个开关切到 qw 可降到秒级，
 * 代价是对话内容出网并按 token 计费。
 */
export function getAgentModelName(): FoundationModelName {
  return process.env.AGENT_PROVIDER === 'qw' ? 'qw' : 'ollama';
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
