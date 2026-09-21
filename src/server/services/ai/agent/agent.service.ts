import 'server-only';

import { AIMessageChunk, ToolMessage } from '@langchain/core/messages';
import { z } from 'zod';
import { createAgent } from '@/server/infra/agent';
import {
  aiMetadataSearchTool,
  dateSearchTool,
  exifSearchTool,
  locationSearchTool
} from './tools/search-photo.tool';

const ARCHIVE_TIME_ZONE = 'Asia/Shanghai';
const PHOTO_SEARCH_TOOL_NAMES = new Set([
  'date_search',
  'location_search',
  'ai_metadata_search',
  'exif_search'
]);

const photoToolResultSchema = z.object({
  query: z.record(z.string(), z.unknown()),
  total: z.number().int().nonnegative(),
  photos: z.array(z.object({ id: z.number().int().positive() }))
});

export type AgentStreamEvent =
  | { type: 'text'; delta: string }
  | {
      type: 'photo-results';
      toolCallId: string;
      toolName: string;
      query: Record<string, unknown>;
      total: number;
      photoIds: number[];
    };

/** 从模型内容块中只提取可展示正文，忽略工具调用与其他内部块。 */
function getTextDelta(content: unknown) {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';

  return content
    .map((block) => {
      if (!block || typeof block !== 'object') return '';
      const { type, text } = block as { type?: unknown; text?: unknown };
      return type === 'text' && typeof text === 'string' ? text : '';
    })
    .join('');
}

function parseToolContent(content: unknown): unknown {
  if (typeof content !== 'string') return content;

  try {
    return JSON.parse(content);
  } catch {
    return null;
  }
}

function getPhotoToolResult(message: ToolMessage) {
  if (!message.name || !PHOTO_SEARCH_TOOL_NAMES.has(message.name)) return null;

  const parsed = photoToolResultSchema.safeParse(parseToolContent(message.content));
  if (!parsed.success) return null;

  const photoIds = [
    ...new Set(parsed.data.photos.map((photo) => photo.id))
  ];
  if (photoIds.length === 0) return null;

  return {
    toolCallId: message.tool_call_id,
    toolName: message.name,
    query: parsed.data.query,
    total: parsed.data.total,
    photoIds
  };
}

class AgentService {
  private createArchiveAgent() {
    const currentDate = new Intl.DateTimeFormat('zh-CN', {
      timeZone: ARCHIVE_TIME_ZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date());

    return createAgent({
      model: 'ollama',
      systemPrompt: `你是帮用户翻照片、找回拍下瞬间的照片小助手，只能依据工具返回的照片资料回答，不得编造照片、时间、地点或拍摄参数。
当前日期（${ARCHIVE_TIME_ZONE}）：${currentDate}。
当用户的问题包含明确日期、相对日期、月份、季度或年份时，必须调用 date_search。
当用户提到省、市、区县、街道、镇乡、景区、地标、附近或详细地址时，必须调用 location_search。
当用户提到逆光、雪山、夜景、人像、暖色调、冷色调、对称、建筑、构图、画面元素或视觉主题时，必须调用 ai_metadata_search。
当用户提到相机、机身、镜头、焦段、长焦、广角、光圈、ISO 或闪光灯时，必须调用 exif_search；大光圈对应较小的 f-number。
工具返回的拍摄时间均按 ${ARCHIVE_TIME_ZONE} 表示，回答时不要改标为 UTC。
回答使用自然、生活化的中文。避免使用“档案、检索、命中、元数据、工具”等技术词；优先说“照片里”“找到”“拍下”“这几张照片”。
调用工具前不要输出面向用户的解释。照片找到后，最终回答只用一到两句话总结，不要逐项罗列照片、参数或标签，因为界面会展示照片九宫格。
如果工具没有返回照片，明确说明在照片里暂时没找到符合条件、且已经有相关信息的照片。`,
      tools: [
        dateSearchTool,
        locationSearchTool,
        aiMetadataSearchTool,
        exifSearchTool
      ],
      openCheckpointer: true
    });
  }

  /**
   * 应用层会话先经过 visitor 归属校验，才会进入 Agent；
   * 因而可安全作为 LangGraph checkpoint 的 thread_id，避免不同会话串上下文。
   */
  private getRunConfig(conversationId: string, signal?: AbortSignal) {
    return {
      configurable: {
        thread_id: `conversation:${conversationId}`
      },
      ...(signal ? { signal } : {})
    };
  }

  /** 产出最终文字增量与可展示的工具照片结果。 */
  async *stream({
    conversationId,
    userMsg,
    signal
  }: {
    conversationId: string;
    userMsg: string;
    signal?: AbortSignal;
  }): AsyncGenerator<AgentStreamEvent> {
    const stream = await this.createArchiveAgent().stream(
      {
        messages: [{ role: 'user', content: userMsg }]
      },
      {
        ...this.getRunConfig(conversationId, signal),
        streamMode: 'messages'
      }
    );

    const processedToolCalls = new Set<string>();

    for await (const [message] of stream) {
      if (signal?.aborted) return;

      if (ToolMessage.isInstance(message)) {
        const result = getPhotoToolResult(message);
        if (result && !processedToolCalls.has(result.toolCallId)) {
          processedToolCalls.add(result.toolCallId);
          yield { type: 'photo-results', ...result };
        }
        continue;
      }

      if (!AIMessageChunk.isInstance(message)) continue;
      const delta = getTextDelta(message.content);
      if (delta) yield { type: 'text', delta };
    }
  }
}

/** 无状态单例；会话隔离由每次 stream 传入的 conversationId 决定。 */
export const agentService = new AgentService();
