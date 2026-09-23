import 'server-only';

import { ImageAnalysisError } from './contracts';
import { analysisEmbeddingService } from './embedding.service';
import { analysisRepository } from './analysis.repository';

export const SEMANTIC_SEARCH_MIN_SIMILARITY = 0.55;

export interface SemanticPhotoSearchResult {
  query: string;
  minSimilarity: number;
  total: number;
  matches: Awaited<ReturnType<typeof analysisRepository.searchByVector>>;
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

    const queryVector = await analysisEmbeddingService.createQueryVector(
      normalizedQuery
    );
    const matches = await analysisRepository.searchByVector(
      queryVector,
      limit,
      SEMANTIC_SEARCH_MIN_SIMILARITY
    );

    return {
      query: normalizedQuery,
      minSimilarity: SEMANTIC_SEARCH_MIN_SIMILARITY,
      total: matches[0]?.total ?? 0,
      matches
    };
  }
}

export const semanticPhotoSearchService = new SemanticPhotoSearchService();
