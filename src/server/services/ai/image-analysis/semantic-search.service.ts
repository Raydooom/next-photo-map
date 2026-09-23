import 'server-only';

import { ImageAnalysisError } from './contracts';
import { analysisEmbeddingService } from './embedding.service';
import { photoQueryPlannerService } from './query-planner.service';
import { analysisRepository } from './analysis.repository';

export const SEMANTIC_SEARCH_MIN_SIMILARITY = 0.55;
export const SEMANTIC_SEARCH_MAX_RESULTS = 6;
export const SEMANTIC_SEARCH_MAX_SCORE_GAP = 0.08;

export interface SemanticPhotoSearchResult {
  /** 语义工具收到的原始查询，供结果展示和审计。 */
  query: string;
  /** 查询规划模型生成的保真检索描述。 */
  plannedQuery: string;
  /** 查询规划模型生成的有限关联词。 */
  relatedTerms: string[];
  minSimilarity: number;
  total: number;
  matches: Awaited<ReturnType<typeof analysisRepository.searchByVector>>;
}

function createEmbeddingQuery(
  sourceQuery: string,
  plannedQuery: string,
  relatedTerms: string[]
) {
  const parts = [sourceQuery];

  if (plannedQuery !== sourceQuery) {
    parts.push(`语义描述：${plannedQuery}`);
  }
  if (relatedTerms.length > 0) {
    parts.push(`摄影关联词：${relatedTerms.join('、')}`);
  }

  return parts.join('。').slice(0, 600);
}

class SemanticPhotoSearchService {
  async search(query: string, limit: number): Promise<SemanticPhotoSearchResult> {
    const normalizedQuery = query.trim();
    if (normalizedQuery.length < 2) {
      throw new ImageAnalysisError(
        'EMBEDDING_FAILED',
        '语义查询内容至少需要两个字符'
      );
    }

    const plan = await photoQueryPlannerService.plan(normalizedQuery);
    const embeddingQuery = createEmbeddingQuery(
      normalizedQuery,
      plan.semanticQuery,
      plan.relatedTerms
    );

    console.info('[Agent] 自动查询规划', {
      sourceQuery: normalizedQuery,
      plannedQuery: plan.semanticQuery,
      relatedTerms: plan.relatedTerms
    });

    const candidates = await analysisRepository.searchByVector(
      await analysisEmbeddingService.createQueryVector(embeddingQuery),
      Math.min(limit, SEMANTIC_SEARCH_MAX_RESULTS),
      SEMANTIC_SEARCH_MIN_SIMILARITY
    );
    const topSimilarity = candidates[0]?.similarity;
    const minAcceptedSimilarity =
      topSimilarity === undefined
        ? SEMANTIC_SEARCH_MIN_SIMILARITY
        : Math.max(
            SEMANTIC_SEARCH_MIN_SIMILARITY,
            topSimilarity - SEMANTIC_SEARCH_MAX_SCORE_GAP
          );
    const matches = candidates.filter(
      (candidate) => candidate.similarity >= minAcceptedSimilarity
    );

    console.info('[Agent] 语义候选收敛', {
      requestedLimit: limit,
      maxResults: SEMANTIC_SEARCH_MAX_RESULTS,
      topSimilarity: topSimilarity ?? null,
      minAcceptedSimilarity,
      candidateCount: candidates.length,
      returnedCount: matches.length
    });

    return {
      query: normalizedQuery,
      plannedQuery: plan.semanticQuery,
      relatedTerms: plan.relatedTerms,
      minSimilarity: minAcceptedSimilarity,
      total: matches.length,
      matches
    };
  }
}

export const semanticPhotoSearchService = new SemanticPhotoSearchService();
