import 'server-only';

import { AIMessageChunk, ToolMessage } from '@langchain/core/messages';
import { z } from 'zod';
import { createAgent } from '@/server/infra/agent';
import {
  aiMetadataSearchTool,
  dateSearchTool,
  exifSearchTool,
  locationSearchTool,
  semanticPhotoSearchTool
} from './tools/search-photo.tool';

const ARCHIVE_TIME_ZONE = 'Asia/Shanghai';
const PHOTO_SEARCH_TOOL_NAMES = new Set([
  'date_search',
  'location_search',
  'ai_metadata_search',
  'semantic_photo_search',
  'exif_search'
]);
const INTERNAL_QUERY_PLAN_PATTERN =
  /\{\s*"semanticQuery"\s*:\s*"[^"]*"\s*,\s*"relatedTerms"\s*:\s*\[[\s\S]*?\]\s*\}/g;

/**
 * 跑过照片工具但一张都没命中时的回复。
 *
 * 只说「没找到」会把对话堵死 —— 用户不知道是条件太窄还是档案里真没有，
 * 因而给出可调整的方向；三个方向对应三类检索维度（时间、地点、画面内容）。
 */
const NO_PHOTO_RESULT_REPLY =
  '照片库里暂时没有符合这些条件的照片。可以把条件放宽一些再试：换个时间范围、换个地点，或者直接描述画面里有什么。';

/** 本轮没有任何可回放正文时的兜底，顺带交代这个助手能按什么条件查 */
const NO_CONTENT_REPLY =
  '想找哪段时间、哪个地方，或者画面里有什么，说一说我就去照片里翻。';

/**
 * 指向照片网格的操作引导。
 *
 * 系统提示里交代了「界面会展示照片网格」，模型于是会顺口补上「点击查看详细信息，
 * 或告诉我是否需要调整搜索条件」。这话只在真出了网格时成立，本轮没有照片时
 * 界面上并没有可点的东西，留着就是指着空处让人点。
 */
const PHOTO_UI_HINT_PATTERN =
  /(点击|点开|点选)[^。！？\n]*(查看|详细信息|详情|大图|照片)|调整(搜索|检索|筛选|查询)条件/;

/** 按句切分后剔除误导句。lookbehind 保留句末标点，未命中的句子原样拼回 */
function stripPhotoUiHints(text: string) {
  return text
    .split(/(?<=[。！？\n])/)
    .filter((sentence) => !PHOTO_UI_HINT_PATTERN.test(sentence))
    .join('')
    .trim();
}

const photoToolPhotoSchema = z.object({
  id: z.number().int().positive(),
  description: z.string().trim().min(1).nullable().optional(),
  theme: z.string().trim().min(1).nullable().optional(),
  tags: z.array(z.string().trim().min(1)).optional()
});

const photoToolResultSchema = z.object({
  query: z.record(z.string(), z.unknown()),
  total: z.number().int().nonnegative(),
  photos: z.array(photoToolPhotoSchema)
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

/** 只提取最终可展示正文，并移除查询规划的内部 JSON 片段。 */
function getTextDelta(content: unknown) {
  const text =
    typeof content === 'string'
      ? content
      : Array.isArray(content)
        ? content
            .map((block) => {
              if (!block || typeof block !== 'object') return '';
              const { type, text } = block as {
                type?: unknown;
                text?: unknown;
              };
              return type === 'text' && typeof text === 'string' ? text : '';
            })
            .join('')
        : '';

  return text.replace(INTERNAL_QUERY_PLAN_PATTERN, '').trimStart();
}

function parseToolContent(content: unknown): unknown {
  if (typeof content !== 'string') return content;

  try {
    return JSON.parse(content);
  } catch {
    return null;
  }
}

function getPhotoSummaryTerms(
  photos: z.infer<typeof photoToolPhotoSchema>[]
) {
  const themes = photos
    .map((photo) => photo.theme)
    .filter((theme): theme is string => Boolean(theme));
  const tags = photos.flatMap((photo) => photo.tags ?? []);
  const seen = new Set<string>();

  return [...themes, ...tags]
    .filter((term) => {
      const normalizedTerm = term.trim();
      if (!normalizedTerm || seen.has(normalizedTerm)) return false;
      seen.add(normalizedTerm);
      return true;
    })
    .slice(0, 2);
}

function getPhotoSummaryDescription(
  photos: z.infer<typeof photoToolPhotoSchema>[]
) {
  return photos.find((photo) => photo.description?.trim())?.description?.trim() ?? '';
}

function getPhotoResultSummary(
  toolName: string,
  summaryTerms: string[],
  description: string
) {
  const subject = summaryTerms.join('、');
  const contextualSummary = subject
    ? `这组照片以${subject}的画面为主。`
    : toolName === 'date_search'
      ? '这段时间拍下的照片呈现了不同场景。'
      : toolName === 'location_search'
        ? '这里拍下的照片呈现了不同场景。'
        : toolName === 'exif_search'
          ? '这些照片体现了不同的拍摄场景。'
          : '这组照片呈现了不同的画面细节。';

  return description
    ? `${contextualSummary}${description}`.replace(/\s+/g, ' ').trim()
    : contextualSummary;
}

function getPhotoToolResult(message: ToolMessage) {
  if (!message.name || !PHOTO_SEARCH_TOOL_NAMES.has(message.name)) return null;

  const parsed = photoToolResultSchema.safeParse(parseToolContent(message.content));
  if (!parsed.success) return null;

  const photoIds = [
    ...new Set(parsed.data.photos.map((photo) => photo.id))
  ];
  const summaryTerms = getPhotoSummaryTerms(parsed.data.photos);
  const summaryDescription = getPhotoSummaryDescription(parsed.data.photos);

  console.info('[Agent] 工具调用完成', {
    toolName: message.name,
    toolCallId: message.tool_call_id,
    query: parsed.data.query,
    total: parsed.data.total,
    summaryTerms,
    returnedPhotoIds: photoIds
  });

  if (photoIds.length === 0) return null;

  return {
    toolCallId: message.tool_call_id,
    toolName: message.name,
    query: parsed.data.query,
    total: parsed.data.total,
    photoIds,
    summaryTerms,
    summaryDescription
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
当用户提到逆光、雪山、夜景、人像、暖色调、冷色调、对称、建筑等明确视觉标签或主题时，必须调用 ai_metadata_search；纯视觉条件无结果时该工具会自动进行语义向量兜底。
当用户以自然语言描述主体关系、动作、空间层次、复杂氛围、抽象风格或同义表达，且不能可靠落为明确标签时，必须调用 semantic_photo_search；保留用户原意，不得补充不存在的拍摄信息。
当用户提到相机、机身、镜头、焦段、长焦、广角、光圈、ISO 或闪光灯时，必须调用 exif_search；大光圈对应较小的 f-number。
工具返回的拍摄时间均按 ${ARCHIVE_TIME_ZONE} 表示，回答时不要改标为 UTC。
调用工具前不要输出面向用户的解释、规划过程、JSON 或 Markdown。照片工具有结果后，不要输出照片数量、编号列表、照片 ID、逐张介绍、时间、地点、拍摄参数、标签清单或推荐理由，因为界面会展示照片网格。
如果工具没有返回照片，明确说明在照片里暂时没找到符合条件、且已经有相关信息的照片。
任何情况下都不要让用户点击界面元素、查看详细信息或确认是否调整搜索条件，界面交互不由你交代。`,
      tools: [
        dateSearchTool,
        locationSearchTool,
        aiMetadataSearchTool,
        semanticPhotoSearchTool,
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

  /**
   * 先缓存 Agent 文本，避免工具调用前的内部规划 JSON 抢先流向界面。
   * 本轮出现照片工具后，照片网格承担结果内容，缓存文本不会被回放。
   */
  async *stream({
    conversationId,
    userMsg,
    signal
  }: {
    conversationId: string;
    userMsg: string;
    signal?: AbortSignal;
  }): AsyncGenerator<AgentStreamEvent> {
    // createArchiveAgent 现在是异步的：checkpoint 建表改为首次调用时完成
    const agent = await this.createArchiveAgent();
    const stream = await agent.stream(
      {
        messages: [{ role: 'user', content: userMsg }]
      },
      {
        ...this.getRunConfig(conversationId, signal),
        streamMode: 'messages'
      }
    );

    const processedToolCalls = new Set<string>();
    const requestedToolCallIds = new Set<string>();
    let bufferedText = '';
    let hasPhotoToolRun = false;
    let photoResultSummary = '';

    for await (const [message] of stream) {
      if (signal?.aborted) return;

      if (ToolMessage.isInstance(message)) {
        if (message.name && PHOTO_SEARCH_TOOL_NAMES.has(message.name)) {
          hasPhotoToolRun = true;
        }

        const result = getPhotoToolResult(message);
        if (result && !processedToolCalls.has(result.toolCallId)) {
          processedToolCalls.add(result.toolCallId);
          photoResultSummary = getPhotoResultSummary(
            result.toolName,
            result.summaryTerms,
            result.summaryDescription
          );
          yield { type: 'photo-results', ...result };
        }
        continue;
      }

      if (!AIMessageChunk.isInstance(message)) continue;

      const toolCalls = message.tool_calls ?? [];
      for (const toolCall of toolCalls) {
        if (!toolCall.name) continue;

        const toolCallId =
          toolCall.id ?? `${toolCall.name}:${JSON.stringify(toolCall.args)}`;
        if (requestedToolCallIds.has(toolCallId)) continue;

        requestedToolCallIds.add(toolCallId);
        console.info('[Agent] 工具决策：调用工具', {
          decision: 'call_tool',
          toolName: toolCall.name,
          toolCallId,
          arguments: toolCall.args
        });
      }

      // 同一 chunk 的文本属于工具调用前后的中间规划，不纳入用户可见正文。
      if (toolCalls.length > 0) continue;

      const delta = getTextDelta(message.content);
      if (delta) bufferedText += delta;
    }

    if (photoResultSummary) {
      yield { type: 'text', delta: photoResultSummary };
    } else if (hasPhotoToolRun) {
      yield { type: 'text', delta: NO_PHOTO_RESULT_REPLY };
    } else {
      // 没有照片时也要保证有一句话可发：原先正文为空就什么都不发，
      // 落库会退成「没有生成可展示的回答」，界面上等同于一句故障提示
      yield {
        type: 'text',
        delta: stripPhotoUiHints(bufferedText) || NO_CONTENT_REPLY
      };
    }

    if (requestedToolCallIds.size === 0) {
      console.info('[Agent] 工具决策：直接回答', {
        decision: 'answer_directly'
      });
    }
  }
}

/** 无状态单例；会话隔离由每次 stream 传入的 conversationId 决定。 */
export const agentService = new AgentService();
