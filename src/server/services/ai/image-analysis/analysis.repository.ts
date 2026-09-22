import 'server-only';

import { prisma } from '@/server/infra/db';
import { AnalysisEmbeddings } from './embedding.service';
import { ImageAnalysisResult } from './contracts';

export interface AnalysisPhotoInput {
  id: number;
  thumbLargeKey: string;
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
