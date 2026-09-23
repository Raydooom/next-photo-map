import 'server-only';

import { prisma } from '@/server/infra/db';
import { AnalysisEmbeddings } from './embedding.service';
import { ImageAnalysisResult } from './contracts';

export interface AnalysisPhotoInput {
  id: number;
  thumbLargeKey: string;
}

export interface SemanticPhotoMatch {
  photoId: number;
  descriptionSimilarity: number | null;
  tagSimilarity: number | null;
  similarity: number;
  total: number;
}

class AnalysisRepository {
  async getPhotoInput(photoId: number): Promise<AnalysisPhotoInput | null> {
    return prisma.photo.findUnique({
      where: { id: photoId },
      select: { id: true, thumbLargeKey: true }
    });
  }

  async listPhotoIds(): Promise<number[]> {
    const photos = await prisma.photo.findMany({
      select: { id: true },
      orderBy: { id: 'asc' }
    });

    return photos.map((photo) => photo.id);
  }

  async getStoredAnalysis(photoId: number) {
    return prisma.photoAiAnalysis.findUnique({
      where: { photoId },
      select: { photoId: true, description: true, theme: true, tags: true }
    });
  }

  async searchByVector(
    queryVector: string,
    limit: number,
    minSimilarity: number
  ): Promise<SemanticPhotoMatch[]> {
    return prisma.$queryRaw<SemanticPhotoMatch[]>`
      WITH similarities AS (
        SELECT
          pa.photo_id,
          CASE
            WHEN pa.embedding IS NULL THEN NULL
            ELSE 1 - (pa.embedding <=> ${queryVector}::vector)
          END AS description_similarity,
          CASE
            WHEN pa.tag_embedding IS NULL THEN NULL
            ELSE 1 - (pa.tag_embedding <=> ${queryVector}::vector)
          END AS tag_similarity
        FROM "photo_ai_analyses" AS pa
        WHERE pa.embedding IS NOT NULL OR pa.tag_embedding IS NOT NULL
      ),
      scored AS (
        SELECT
          photo_id,
          description_similarity,
          tag_similarity,
          CASE
            WHEN description_similarity IS NOT NULL AND tag_similarity IS NOT NULL
              THEN description_similarity * 0.8 + tag_similarity * 0.2
            ELSE COALESCE(description_similarity, tag_similarity)
          END AS similarity
        FROM similarities
      )
      SELECT
        photo_id AS "photoId",
        description_similarity AS "descriptionSimilarity",
        tag_similarity AS "tagSimilarity",
        similarity,
        (COUNT(*) OVER())::int AS total
      FROM scored
      WHERE similarity >= ${minSimilarity}
      ORDER BY similarity DESC, photo_id ASC
      LIMIT ${limit}
    `;
  }

  async upsert(
    photoId: number,
    metadata: ImageAnalysisResult,
    embeddings: AnalysisEmbeddings
  ) {
    await prisma.$executeRaw`
      INSERT INTO "photo_ai_analyses"
        (photo_id, theme, description, tags, embedding, tag_embedding, updated_at)
      VALUES
        (${photoId}, ${metadata.theme}, ${metadata.description}, ${metadata.tags}, ${embeddings.descriptionVector}::vector, ${embeddings.tagVector}::vector, NOW())
      ON CONFLICT (photo_id)
      DO UPDATE SET
        theme = EXCLUDED.theme,
        description = EXCLUDED.description,
        tags = EXCLUDED.tags,
        embedding = EXCLUDED.embedding,
        tag_embedding = EXCLUDED.tag_embedding,
        updated_at = NOW()
    `;
  }

  async updateEmbeddings(photoId: number, embeddings: AnalysisEmbeddings) {
    await prisma.$executeRaw`
      UPDATE "photo_ai_analyses"
      SET embedding = ${embeddings.descriptionVector}::vector,
          tag_embedding = ${embeddings.tagVector}::vector,
          updated_at = NOW()
      WHERE photo_id = ${photoId}
    `;
  }
}

export const analysisRepository = new AnalysisRepository();
