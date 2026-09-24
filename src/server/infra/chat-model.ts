import 'server-only';

import { ChatOpenAI } from '@langchain/openai';
import { ChatOllama, OllamaEmbeddings } from '@langchain/ollama';

/**
 * 可选的模型来源。
 * - qw：阿里云百炼（DashScope）的 OpenAI 兼容端点
 * - ms：魔搭社区（ModelScope）推理 API，同为 OpenAI 兼容
 * - ollama：本机或局域网的 Ollama
 */
export type FoundationModelName = 'qw' | 'ms' | 'ollama';

function normalizeOllamaBaseUrl(value?: string) {
  return (value || 'http://localhost:11434').replace(/\/?api\/?$/, '');
}

const ollamaBaseUrl = normalizeOllamaBaseUrl(
  process.env.OLLAMA_API_URL || process.env.OLLAMA_BASE_URL
);

/**
 * 按需创建，不在模块加载时把三家都实例化。
 *
 * 三者只会用到一个，而云端两家的 apiKey 各自独立；提前构造等于要求
 * 部署时把没打算用的 key 也配上，缺失时还可能在模块加载阶段就抛错。
 */
const modelFactories: Record<
  FoundationModelName,
  () => ChatOpenAI | ChatOllama
> = {
  qw: () =>
    new ChatOpenAI({
      model: process.env.QWEN_MODEL || 'qwen3.8-max',
      apiKey: process.env.QWEN_API_KEY!,
      configuration: { baseURL: process.env.QWEN_API_URL },
      temperature: 0
    }),
  // 地址与模型 ID 全部由环境变量给出，代码不留默认值：
  // 两处都写等于埋一份容易和部署配置对不上的影子配置
  ms: () =>
    new ChatOpenAI({
      model: process.env.MODELSCOPE_MODEL!,
      apiKey: process.env.MODELSCOPE_API_KEY!,
      configuration: { baseURL: process.env.MODELSCOPE_API_URL },
      temperature: 0
    }),
  ollama: () =>
    new ChatOllama({
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

/** 同一来源在进程内复用一个实例，避免每轮对话都重建客户端 */
const modelCache = new Map<FoundationModelName, ChatOpenAI | ChatOllama>();

const embeddingModel = new OllamaEmbeddings({
  model: process.env.EMBEDDING_MODEL || 'bge-m3',
  baseUrl: ollamaBaseUrl
});

/** Agent 使用的文字模型入口，不初始化 LangGraph checkpoint。 */
export function getFoundationChatModel(
  model: FoundationModelName = 'ollama'
) {
  let instance = modelCache.get(model);

  if (!instance) {
    instance = modelFactories[model]();
    modelCache.set(model, instance);
  }

  return instance;
}

/**
 * Agent 的模型来源，取自 AGENT_PROVIDER：qw / ms / ollama，默认 ollama。
 *
 * 低配机器（纯 CPU）上本地 4B 模型的 prefill 只有个位数 token/s，
 * 一次带工具调用的对话要分钟级；切到云端可降到秒级，
 * 代价是对话内容出网，并按各家的计费规则消耗额度。
 *
 * 取到非法值时回落本地，不抛错 —— 配错一个单词不该让整个对话接口不可用。
 */
export function getAgentModelName(): FoundationModelName {
  const provider = process.env.AGENT_PROVIDER?.trim();

  return provider === 'qw' || provider === 'ms' ? provider : 'ollama';
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
