import 'server-only';

import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai';
import { ChatOllama, OllamaEmbeddings } from '@langchain/ollama';

/**
 * 模型按「用途」配置，不按平台配置。
 *
 * 三组环境变量，每组四项 API_TYPE / MODEL / API_URL / API_KEY：
 *   CHAT_*      Agent 对话与查询规划
 *   VISION_*    入库时的图片分析
 *   EMBEDDING_* 向量嵌入
 *
 * API_TYPE 只区分调用协议，不区分平台：
 *   ollama → 本地 / 局域网的 Ollama 原生接口
 *   openai → OpenAI 兼容端点（百炼、魔搭，以及任何兼容该协议的平台）
 * 所以换平台、接新平台都只改环境变量，这里不需要新增分支。
 */
type ModelPurpose = 'CHAT' | 'VISION' | 'EMBEDDING';

type ModelApiType = 'ollama' | 'openai';

interface ModelEndpoint {
  apiType: ModelApiType;
  model?: string;
  apiUrl?: string;
  apiKey?: string;
}

/**
 * 默认 openai：兼容该协议的平台占多数，接新平台只需填 model / url / key。
 * 走 Ollama 必须显式写明 API_TYPE=ollama。
 */
function readEndpoint(purpose: ModelPurpose): ModelEndpoint {
  return {
    apiType:
      process.env[`${purpose}_API_TYPE`]?.trim() === 'ollama'
        ? 'ollama'
        : 'openai',
    model: process.env[`${purpose}_MODEL`],
    apiUrl: process.env[`${purpose}_API_URL`],
    apiKey: process.env[`${purpose}_API_KEY`]
  };
}

/** Ollama 客户端自行拼接 /api，容忍配置里把该后缀写上 */
function normalizeOllamaBaseUrl(value?: string) {
  return (value || 'http://localhost:11434').replace(/\/?api\/?$/, '');
}

/**
 * 对话类模型。图片分析走同一条路径：vision-analyzer 发的是 LangChain 标准的
 * image_url content block，两种客户端都能接。
 *
 * @param ollamaOptions 仅在走 Ollama 时下发，OpenAI 兼容端点不认这些字段
 */
function createChatModel(
  purpose: ModelPurpose,
  ollamaOptions?: { think?: boolean }
) {
  const { apiType, model, apiUrl, apiKey } = readEndpoint(purpose);

  if (apiType === 'ollama') {
    return new ChatOllama({
      model,
      baseUrl: normalizeOllamaBaseUrl(apiUrl),
      temperature: 0,
      ...ollamaOptions
    });
  }

  return new ChatOpenAI({
    model,
    apiKey,
    configuration: { baseURL: apiUrl },
    temperature: 0
  });
}

/** 按用途缓存，进程内复用同一客户端 */
const chatModelCache = new Map<ModelPurpose, ChatOpenAI | ChatOllama>();

function getCachedChatModel(
  purpose: ModelPurpose,
  ollamaOptions?: { think?: boolean }
) {
  let instance = chatModelCache.get(purpose);

  if (!instance) {
    instance = createChatModel(purpose, ollamaOptions);
    chatModelCache.set(purpose, instance);
  }

  return instance;
}

/**
 * Agent 对话与查询规划共用的文字模型，不初始化 LangGraph checkpoint。
 *
 * think: false 关掉 qwen3 的思考模式，仅对 Ollama 下发。本 Agent 只需要一次
 * 工具调用决策，有照片时最终正文由服务端的固定摘要承担，思考 token 在 CPU
 * 推理下是纯粹的等待。CHAT_MODEL 换成不支持 thinking 的 Ollama 模型
 * （如 qwen2.5 系列）时需去掉该字段，Ollama 对此会返回 400。
 */
export function getChatModel() {
  return getCachedChatModel('CHAT', { think: false });
}

/** 图片视觉模型，与对话模型各自独立配置，可分别落在不同平台 */
export function getVisionChatModel() {
  return getCachedChatModel('VISION');
}

let embeddingModel: OllamaEmbeddings | OpenAIEmbeddings | undefined;

/**
 * 向量模型。
 *
 * 换平台或换模型前请确认输出维度仍是 1024 —— 库表的列定义是 vector(1024)，
 * 维度一变，已入库的历史向量全部失效，需要改列定义并重算。
 */
export function getEmbeddingModel() {
  if (!embeddingModel) {
    const { apiType, model, apiUrl, apiKey } = readEndpoint('EMBEDDING');

    embeddingModel =
      apiType === 'ollama'
        ? new OllamaEmbeddings({
            model,
            baseUrl: normalizeOllamaBaseUrl(apiUrl)
          })
        : new OpenAIEmbeddings({
            model,
            apiKey,
            configuration: { baseURL: apiUrl }
          });
  }

  return embeddingModel;
}
