import 'server-only';

import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { z } from 'zod';
import { getChatModel } from '@/server/infra/chat-model';

const MAX_RELATED_TERMS = 6;
const MAX_SEMANTIC_QUERY_LENGTH = 400;

const PHOTO_QUERY_PLANNER_PROMPT = `
你是摄影照片检索的查询规划器，不回答用户问题，也不调用工具。
根据用户给出的原始查询，输出适合图像语义检索的严格 JSON：
{
  "semanticQuery": "保留原意的简洁中文检索描述",
  "relatedTerms": ["最多 6 个可合理推导出的摄影视觉关联词"]
}

规则：
- semanticQuery 必须保留用户的主体、动作、场景、时间感或氛围，不得用关联词替代原意。
- relatedTerms 只写从原始查询可合理推导出的同义词、近义视觉概念或摄影表达。
- 不得虚构照片中没有依据的地点、日期、人物身份、相机参数或具体事实。
- 信息不足时，semanticQuery 原样保留用户查询，relatedTerms 返回空数组。
- 只输出 JSON，不要 Markdown、解释或额外字段。
`;

const relatedTermSchema = z.string().trim().min(1).max(48);

const photoQueryPlanSchema = z
  .object({
    semanticQuery: z.string().trim().min(2).max(MAX_SEMANTIC_QUERY_LENGTH),
    relatedTerms: z.array(relatedTermSchema).max(MAX_RELATED_TERMS).default([])
  })
  .transform(({ semanticQuery, relatedTerms }) => {
    const normalizedSemanticQuery = semanticQuery.trim();
    const seen = new Set<string>();
    const normalizedQuery = normalizedSemanticQuery.toLocaleLowerCase();

    return {
      semanticQuery: normalizedSemanticQuery,
      relatedTerms: relatedTerms
        .map((term) => term.trim())
        .filter((term) => {
          const normalizedTerm = term.toLocaleLowerCase();
          if (!term || normalizedTerm === normalizedQuery || seen.has(normalizedTerm)) {
            return false;
          }
          seen.add(normalizedTerm);
          return true;
        })
        .slice(0, MAX_RELATED_TERMS)
    };
  });

export type PhotoQueryPlan = z.infer<typeof photoQueryPlanSchema>;

function getTextContent(content: unknown) {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';

  return content
    .map((part) =>
      part && typeof part === 'object' && 'text' in part
        ? String((part as { text?: unknown }).text ?? '')
        : ''
    )
    .join('');
}

function parsePhotoQueryPlan(raw: string): PhotoQueryPlan {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const source = (fenced ?? raw).trim();
  const start = source.indexOf('{');
  const end = source.lastIndexOf('}');

  if (start === -1 || end === -1 || end <= start) {
    throw new Error('查询规划模型没有返回 JSON 对象');
  }

  return photoQueryPlanSchema.parse(JSON.parse(source.slice(start, end + 1)));
}

function createFallbackPlan(sourceQuery: string): PhotoQueryPlan {
  return { semanticQuery: sourceQuery, relatedTerms: [] };
}

class PhotoQueryPlannerService {
  /**
   * 单次基础模型调用，只规划检索文本；不创建 Agent、工具循环或 checkpoint。
   * 规划失败时降级为原始查询，不能阻断既有向量检索。
   */
  async plan(sourceQuery: string): Promise<PhotoQueryPlan> {
    const normalizedQuery = sourceQuery.trim();
    const fallback = createFallbackPlan(normalizedQuery);

    try {
      // 与 Agent 对话共用 CHAT_* 配置，换平台时两处一起生效
      const response = await getChatModel().invoke([
        new SystemMessage(PHOTO_QUERY_PLANNER_PROMPT),
        new HumanMessage(`原始查询：${normalizedQuery}`)
      ]);
      const plan = parsePhotoQueryPlan(getTextContent(response.content));

      return {
        semanticQuery: plan.semanticQuery,
        relatedTerms: plan.relatedTerms
      };
    } catch (error) {
      console.warn('[Agent] 查询规划失败，回退原始查询:', error);
      return fallback;
    }
  }
}

export const photoQueryPlannerService = new PhotoQueryPlannerService();
