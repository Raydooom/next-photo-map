import 'server-only';

import { AIMessageChunk } from '@langchain/core/messages';
import { createAgent } from '@/server/infra/agent';
import { dateSearchTool } from './tools/search-photo.tool';

const ARCHIVE_TIME_ZONE = 'Asia/Shanghai';

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
      systemPrompt: `你是摄影档案检索助手，只能依据工具返回的照片资料回答，不得编造照片、时间、地点或拍摄参数。
当前日期（${ARCHIVE_TIME_ZONE}）：${currentDate}。
当用户的问题包含明确日期、相对日期、月份、季度或年份时，必须调用 date_search。
date_search 的 startDate 和 endDate 均为包含边界的 YYYY-MM-DD 日历日期；例如查询 2025 年 10 月，传 2025-10-01 至 2025-10-31。
工具返回的拍摄时间均按 ${ARCHIVE_TIME_ZONE} 表示，回答时不要改标为 UTC。
调用工具前不要输出面向用户的解释；工具结果返回后再给出最终回答。
如果工具没有返回照片，明确说明在该日期范围内未找到带拍摄时间记录的照片。`,
      tools: [dateSearchTool],
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

  /** 仅产出最终回答的可展示文本增量。 */
  async *stream({
    conversationId,
    userMsg,
    signal
  }: {
    conversationId: string;
    userMsg: string;
    signal?: AbortSignal;
  }) {
    const stream = await this.createArchiveAgent().stream(
      {
        messages: [{ role: 'user', content: userMsg }]
      },
      {
        ...this.getRunConfig(conversationId, signal),
        streamMode: 'messages'
      }
    );

    for await (const [message] of stream) {
      if (signal?.aborted) return;
      if (!AIMessageChunk.isInstance(message)) continue;

      const delta = getTextDelta(message.content);
      if (delta) yield delta;
    }
  }
}

/** 无状态单例；会话隔离由每次 stream 传入的 conversationId 决定。 */
export const agentService = new AgentService();
